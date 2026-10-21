import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { db } from "../../src/server/db";
import { getEnv } from "../../src/server/config";
import { createAuth } from "../../src/server/auth";
import { grantTestPlan, clearTestBilling } from "../helpers/saas";
import { defaultPreferences } from "../../src/domain/preferences";
import {
  removeReference,
  cleanupDetachedReferences,
  writeReference,
} from "../../src/server/reference-storage";
import {
  startJob,
  regenerateJob,
  referenceSnapshot,
} from "../../src/server/projects";
import { processReference } from "../../src/worker/references";
import type { Snapshot } from "../../src/domain/types";
import { docxFixture, pdfFixture } from "../helpers/references";

const base = getEnv().APP_URL;
const accounts: { id: string; cookie: string }[] = [];
async function request(
  route: string,
  method = "GET",
  body?: unknown,
  cookie = accounts[0].cookie,
) {
  return fetch(base + "/api" + route, {
    method,
    headers: {
      Origin: base,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function upload(
  projectId: string,
  briefVersion: number,
  name: string,
  data: Buffer = Buffer.from(
    "Kebutuhan Studio Karsa: gunakan grid editorial untuk halaman layanan.",
  ),
  extra: Record<string, string> = {},
) {
  return fetch(base + `/api/projects/${projectId}/attachments`, {
    method: "POST",
    headers: {
      Origin: base,
      Cookie: accounts[0].cookie,
      "X-Brief-Version": String(briefVersion),
      "X-File-Name": encodeURIComponent(name),
      ...extra,
    },
    body: new Uint8Array(data),
  });
}
async function project() {
  const preferences = defaultPreferences();
  preferences.technology = {
    mode: "manual",
    choices: { frontend: "Astro", rendering: "SSG", database: "none" },
    additional: "Gunakan hosting statis.",
  };
  preferences.colors = {
    mode: "manual",
    palette: [
      { name: "Primary", hex: "#135" },
      { name: "Secondary", hex: "#fed" },
    ],
  };
  preferences.style = {
    mode: "manual",
    values: { headingFont: "Lora", layout: "Asymmetric", motion: "None" },
  };
  preferences.skills = {
    mode: "manual",
    selected: ["ui-craft", "webapp-testing"],
  };
  const response = await request("/projects", "POST", {
    name: "Reference fixture",
    webType: "landing",
    brief:
      "Website studio desain untuk UMKM. Tampilkan layanan, portofolio, kontak WhatsApp. Tanpa login atau pembayaran. Prioritas mobile dan SEO.",
    preferences,
  });
  expect(response.status).toBe(201);
  return (await response.json()).project as {
    id: string;
    briefVersion: number;
    preferences: typeof preferences;
  };
}
async function ready(id: string) {
  let value = await db.projectAttachment.findUniqueOrThrow({ where: { id } });
  const end = Date.now() + 45000;
  while (["queued", "processing"].includes(value.status) && Date.now() < end) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    value = await db.projectAttachment.findUniqueOrThrow({ where: { id } });
  }
  expect(value.status, value.errorCode ?? "reference should finish").toBe(
    "ready",
  );
  return value;
}
async function completed(id: string) {
  let job = await db.job.findUniqueOrThrow({
    where: { id },
    include: { files: true },
  });
  const end = Date.now() + 75000;
  while (
    ["queued", "running", "validating"].includes(job.status) &&
    Date.now() < end
  ) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    job = await db.job.findUniqueOrThrow({
      where: { id },
      include: { files: true },
    });
  }
  expect(job.status, job.errorCode ?? "job should finish").toBe("succeeded");
  return job;
}
beforeAll(async () => {
  const env = getEnv();
  if (
    env.MOCK_LLM !== "true" ||
    !["localhost", "127.0.0.1"].includes(new URL(base).hostname) ||
    !["localhost", "127.0.0.1"].includes(new URL(env.DATABASE_URL).hostname)
  )
    throw new Error(
      "Customization tests require local app/database and MOCK_LLM=true",
    );
  for (let i = 0; i < 2; i++) {
    const email = `reference-test-${crypto.randomUUID()}@localhost.test`,
      password = randomBytes(24).toString("hex");
    const result = await createAuth(true).api.signUpEmail({
      body: { name: "Reference fixture", email, password },
    });
    accounts.push({ id: result.user.id, cookie: "" });
    await db.user.update({
      where: { id: result.user.id },
      data: { emailVerified: true },
    });
    await grantTestPlan(result.user.id);
    const login = await fetch(base + "/api/auth/sign-in/email", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    expect(login.status).toBe(200);
    accounts[i].cookie = login.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
  }
});
afterAll(async () => {
  for (const account of accounts) {
    const owner = await db.user.findUnique({ where: { id: account.id } });
    if (!owner?.email.startsWith("reference-test-"))
      throw new Error("Refusing non-fixture cleanup");
    const references = await db.projectAttachment.findMany({
      where: { project: { userId: account.id } },
    });
    const jobs = await db.job.findMany({
      where: { userId: account.id },
      select: { id: true },
    });
    for (const job of jobs) await completed(job.id);
    const tasks = await db.planningTask.findMany({
      where: { project: { userId: account.id } },
      select: { id: true },
    });
    await db.outboxEvent.deleteMany({
      where: {
        resourceId: {
          in: [...jobs, ...tasks, ...references].map((item) => item.id),
        },
      },
    });
    await db.idempotencyKey.deleteMany({ where: { userId: account.id } });
    await clearTestBilling(account.id);
    await db.job.deleteMany({ where: { userId: account.id } });
    await db.plan.deleteMany({ where: { project: { userId: account.id } } });
    await db.user.delete({ where: { id: account.id } });
    await db.usageDaily.deleteMany({ where: { userId: account.id } });
    await db.auditEvent.deleteMany({ where: { userId: account.id } });
    for (const reference of references)
      await removeReference(reference.storageKey);
  }
  await db.$disconnect();
});

describe("customization persistence and private references", () => {
  it("validates uploads, ownership, versions, image normalization and document extraction", async () => {
    const draft = await project();
    let version = draft.briefVersion;
    expect(draft.preferences.colors.palette[0].hex).toBe("#113355");
    expect((await upload(draft.id, version, "wrong.png")).status).toBe(400);
    expect((await upload(draft.id, version, "active.html")).status).toBe(400);
    expect((await upload(draft.id, version, "../brief.md")).status).toBe(400);
    expect(
      (
        await upload(draft.id, version, "brief.md", undefined, {
          Origin: "https://hostile.example",
        })
      ).status,
    ).toBe(403);
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(oversized);
    expect(
      (await upload(draft.id, version, "large.png", oversized)).status,
    ).toBe(413);
    const image = await sharp({
      create: { width: 80, height: 80, channels: 3, background: "#235c46" },
    })
      .jpeg()
      .withMetadata()
      .toBuffer();
    for (const [name, content] of [
      [
        "brief.md",
        Buffer.from("# Karsa\nReferensi konten layanan Studio Karsa."),
      ],
      ["mood.jpg", image],
      ["requirements.pdf", pdfFixture()],
      ["content.docx", await docxFixture()],
    ] as const) {
      const response = await upload(draft.id, version, name, content);
      expect(response.status).toBe(202);
      const result = await response.json();
      version = result.briefVersion;
      const file = await ready(result.attachmentId);
      const download = `/projects/${draft.id}/attachments/${file.id}/download`;
      expect(
        (await request(download, "GET", undefined, accounts[1].cookie)).status,
      ).toBe(404);
      const permitted = await request(download);
      expect(permitted.status).toBe(200);
      expect(permitted.headers.get("cache-control")).toBe("private, no-store");
      expect(permitted.headers.get("x-content-type-options")).toBe("nosniff");
      if (name === "mood.jpg") {
        expect(file.mime).toBe("image/webp");
        expect(file.errorCode).toBe("IMAGE_NOT_ANALYZED");
        expect(
          (await sharp(Buffer.from(await permitted.arrayBuffer())).metadata())
            .exif,
        ).toBeUndefined();
        expect(
          (
            await request(
              `/projects/${draft.id}/attachments/${file.id}/analyze`,
              "POST",
              { briefVersion: version },
            )
          ).status,
        ).toBe(409);
      } else expect(file.text).toContain("Karsa");
    }
    expect(
      (
        await request(
          `/projects/${draft.id}/attachments`,
          "GET",
          undefined,
          accounts[1].cookie,
        )
      ).status,
    ).toBe(404);
    expect((await upload(draft.id, 1, "stale.md")).status).toBe(409);
    const detail = await (await request(`/projects/${draft.id}`)).json();
    expect(JSON.stringify(detail)).not.toContain("storageKey");
    expect(detail.project.attachments).toHaveLength(4);
  });
  it("restores preferences and reference notes; keeps job and regeneration snapshots immutable", async () => {
    const draft = await project();
    const uploaded = await upload(draft.id, draft.briefVersion, "brand.md");
    const reference = await uploaded.json();
    await ready(reference.attachmentId);
    const route = `/projects/${draft.id}/attachments/${reference.attachmentId}`;
    const note = {
      role: "brand",
      note: "Gunakan grid editorial Karsa.",
      sourceUrl: "https://example.com/karsa",
      rights: "Aset milik fixture",
    };
    const saved = await (
      await request(route, "PATCH", {
        ...note,
        briefVersion: reference.briefVersion,
      })
    ).json();
    const originalVersion = saved.briefVersion;
    const changed = await (
      await request(route, "PATCH", {
        ...note,
        note: "Catatan berubah",
        briefVersion: originalVersion,
      })
    ).json();
    const revisions = await (
      await request(`/projects/${draft.id}/revisions`)
    ).json();
    const revision = revisions.revisions.find(
      (item: { version: number }) => item.version === originalVersion,
    );
    const restore = await request(`/projects/${draft.id}/revisions`, "POST", {
      revisionId: revision.id,
      briefVersion: changed.briefVersion,
    });
    expect(restore.status).toBe(200);
    const restored = (await restore.json()).project;
    expect(
      (
        await db.projectAttachment.findUniqueOrThrow({
          where: { id: reference.attachmentId },
        })
      ).note,
    ).toBe(note.note);
    expect(restored.preferences).toEqual(draft.preferences);
    const preset = await request("/presets", "POST", {
      name: "Custom preset",
      webType: "landing",
      brief: restored.brief,
      preferences: restored.preferences,
    });
    expect(preset.status).toBe(201);
    const presets = await (await request("/presets")).json();
    expect(presets.presets[0].preferences).toEqual(draft.preferences);
    const queued = await request(`/projects/${draft.id}/plans`, "POST", {
      briefVersion: restored.briefVersion,
    });
    expect(queued.status).toBe(202);
    const end = Date.now() + 45000;
    while (
      (await db.project.findUniqueOrThrow({ where: { id: draft.id } }))
        .status === "planning" &&
      Date.now() < end
    )
      await new Promise((resolve) => setTimeout(resolve, 200));
    const plan = await db.plan.findFirstOrThrow({
      where: { projectId: draft.id },
      orderBy: { version: "desc" },
    });
    const job = await completed(
      (
        await startJob(
          accounts[0].id,
          draft.id,
          plan.version,
          "customized-output-fixture",
        )
      ).id,
    );
    const snapshot = job.snapshot as unknown as Snapshot;
    expect(snapshot.projectContext?.preferences.technology.frontend).toBe(
      "Astro",
    );
    expect(snapshot.projectContext?.references[0].note).toBe(note.note);
    expect(snapshot.projectContext?.loading).toMatchObject({
      webType: "landing",
      rendering: "SSG",
      profile: "content",
    });
    expect(
      job.files.find((file) => file.fileId === "design")?.content,
    ).toContain("#113355");
    expect(
      job.files.find((file) => file.fileId === "design")?.content,
    ).toContain("Lora");
    expect(
      job.files.find((file) => file.fileId === "brief")?.content,
    ).toContain("grid editorial Karsa");
    expect(
      job.files.find((file) => file.fileId === "agents")?.content,
    ).toContain("webapp-testing");
    expect(
      job.files.find((file) => file.fileId === "agents")?.content,
    ).toContain("jangan menambahkan skeleton pada konten statis");
    expect(
      job.files.find((file) => file.fileId === "testing")?.content,
    ).toContain("hero/LCP diminta tanpa scroll");
    expect(JSON.stringify(job.manifest)).not.toContain("storageKey");
    const edited = structuredClone(draft.preferences);
    edited.colors.palette[0].hex = "#AA0000";
    expect(
      (
        await request(`/projects/${draft.id}`, "PATCH", {
          briefVersion: restored.briefVersion,
          preferences: edited,
        })
      ).status,
    ).toBe(200);
    const regeneration = await completed(
      (
        await regenerateJob(
          accounts[0].id,
          job.id,
          ["design"],
          "customized-regeneration-fixture",
        )
      ).id,
    );
    expect(
      (regeneration.snapshot as unknown as Snapshot).projectContext,
    ).toEqual(snapshot.projectContext);
    expect(
      regeneration.files.find((file) => file.fileId === "design")?.content,
    ).toContain("#113355");
    expect((await request(`/jobs/${regeneration.id}/download`)).status).toBe(
      200,
    );
  });
  it("enforces the file quota and removes unreferenced detached files after retention", async () => {
    const draft = await project();
    let version = draft.briefVersion;
    for (let i = 0; i < 10; i++) {
      const response = await upload(draft.id, version, `file-${i}.md`);
      expect(response.status).toBe(202);
      version = (await response.json()).briefVersion;
    }
    expect((await upload(draft.id, version, "overflow.md")).status).toBe(413);
    const references = await db.projectAttachment.findMany({
      where: { projectId: draft.id },
    });
    for (const reference of references) await ready(reference.id);
    const detached = references[0];
    const removed = await request(
      `/projects/${draft.id}/attachments/${detached.id}`,
      "DELETE",
      undefined,
      accounts[0].cookie,
    );
    // DELETE needs a version header, including requests from custom clients.
    expect(removed.status).toBe(400);
    const response = await fetch(
      base + `/api/projects/${draft.id}/attachments/${detached.id}`,
      {
        method: "DELETE",
        headers: {
          Origin: base,
          Cookie: accounts[0].cookie,
          "X-Brief-Version": String(version),
        },
      },
    );
    expect(response.status).toBe(200);
    await db.projectAttachment.update({
      where: { id: detached.id },
      data: { updatedAt: new Date(Date.now() - 7200000) },
    });
    await cleanupDetachedReferences();
    expect(
      await db.projectAttachment.findUnique({ where: { id: detached.id } }),
    ).not.toBeNull();
    await db.projectRevision.deleteMany({ where: { projectId: draft.id } });
    await cleanupDetachedReferences();
    expect(
      await db.projectAttachment.findUnique({ where: { id: detached.id } }),
    ).toBeNull();
    await removeReference(detached.storageKey);
  });
  it("fails closed on public scanner errors, blocks rejected plans and recovers scanned PDFs with manual notes", async () => {
    const draft = await project();
    const storageKey = `${crypto.randomUUID()}.blob`;
    const data = pdfFixture(1, "");
    await writeReference(storageKey, data);
    const file = await db.projectAttachment.create({
      data: {
        projectId: draft.id,
        name: "scan.pdf",
        mime: "application/pdf",
        storageKey,
        bytes: data.length,
      },
    });
    try {
      vi.stubEnv("APP_URL", "https://app.example.test");
      vi.stubEnv("REFERENCE_SCANNER_PATH", "");
      await processReference(file.id);
      expect(
        await db.projectAttachment.findUniqueOrThrow({
          where: { id: file.id },
        }),
      ).toMatchObject({
        status: "rejected",
        errorCode: "REFERENCE_SCANNER_REQUIRED",
      });
      await db.projectAttachment.update({
        where: { id: file.id },
        data: { status: "queued" },
      });
      vi.stubEnv("REFERENCE_SCANNER_PATH", "/usr/bin/false");
      await processReference(file.id);
      expect(
        await db.projectAttachment.findUniqueOrThrow({
          where: { id: file.id },
        }),
      ).toMatchObject({
        status: "rejected",
        errorCode: "REFERENCE_SCAN_FAILED",
      });
    } finally {
      vi.unstubAllEnvs();
    }
    const rejected = await request(`/projects/${draft.id}/plans`, "POST", {
      briefVersion: draft.briefVersion,
    });
    expect(rejected.status).toBe(409);
    expect(JSON.stringify(await rejected.json())).toContain(
      "REFERENCE_REJECTED",
    );
    expect(
      (await request(`/projects/${draft.id}/attachments/${file.id}/download`))
        .status,
    ).toBe(409);
    const retry = await fetch(
      base + `/api/projects/${draft.id}/attachments/${file.id}/retry`,
      {
        method: "POST",
        headers: {
          Origin: base,
          Cookie: accounts[0].cookie,
          "X-Brief-Version": String(draft.briefVersion),
        },
      },
    );
    expect(retry.status).toBe(202);
    const version = (await retry.json()).briefVersion;
    const recovered = await ready(file.id);
    expect(recovered).toMatchObject({ errorCode: "OCR_REQUIRED", text: "" });
    expect(
      (await request(`/projects/${draft.id}/attachments/${file.id}/download`))
        .status,
    ).toBe(200);
    const saved = await request(
      `/projects/${draft.id}/attachments/${file.id}`,
      "PATCH",
      {
        briefVersion: version,
        note: "Catatan manual denah dari PDF hasil scan.",
        role: "requirements",
      },
    );
    expect(saved.status).toBe(200);
    expect(await referenceSnapshot(db, draft.id)).toEqual([
      expect.objectContaining({
        note: "Catatan manual denah dari PDF hasil scan.",
        text: "",
        status: "ready",
      }),
    ]);
  });
});
