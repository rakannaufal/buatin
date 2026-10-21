import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { db, json } from "../../src/server/db";
import { createAuth } from "../../src/server/auth";
import { startJob, resumeJob, changePlan } from "../../src/server/projects";
import { catalog } from "../../src/domain/catalog";
import { maintenance } from "../../src/worker/maintenance";
import { weekPeriod } from "../../src/domain/billing";
import { entitlementFor } from "../../src/server/entitlements";
import { grantTestPlan, clearTestBilling } from "../helpers/saas";
import { generateJob } from "../../src/worker/generator";
import { fixtureLogin } from "../helpers/http";
import type { Snapshot } from "../../src/domain/types";

const base = process.env.APP_URL || "http://localhost:3000";
const mock = new URL(
  process.env.MOCK_LLM_BASE_URL || "http://127.0.0.1:4010/v1",
).origin;
const fixtureIds: string[] = [];
function zipEntries(buffer: Buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  expect(end).toBeGreaterThanOrEqual(0);
  const count = buffer.readUInt16LE(end + 10);
  let cursor = buffer.readUInt32LE(end + 16);
  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    expect(buffer.readUInt32LE(cursor)).toBe(0x02014b50);
    const size = buffer.readUInt16LE(cursor + 28);
    names.push(buffer.toString("utf8", cursor + 46, cursor + 46 + size));
    cursor +=
      46 +
      size +
      buffer.readUInt16LE(cursor + 30) +
      buffer.readUInt16LE(cursor + 32);
  }
  return names;
}
let userId = "",
  cookie = "",
  otherCookie = "";
async function request(
  path: string,
  method = "GET",
  data?: unknown,
  session = cookie,
  extra: Record<string, string> = {},
) {
  return fetch(base + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      Cookie: session,
      ...extra,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
async function control(data: unknown) {
  await fetch(mock + "/__control", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
async function waitFor<T>(
  read: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeout = 75000,
): Promise<T> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await read();
    if (predicate(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Timed out waiting for persistent workflow");
}
async function jobDone(id: string) {
  return waitFor(
    () => db.job.findUniqueOrThrow({ where: { id }, include: { files: true } }),
    (job) =>
      ["succeeded", "partial", "failed", "cancelled"].includes(job.status),
  );
}
async function fixture() {
  const password = randomBytes(24).toString("hex"),
    email = `test-${crypto.randomUUID()}@localhost.test`;
  const result = await createAuth(true).api.signUpEmail({
    body: { name: "Integration fixture", email, password },
  });
  fixtureIds.push(result.user.id);
  await db.user.update({
    where: { id: result.user.id },
    data: { role: "user", emailVerified: true },
  });
  await grantTestPlan(result.user.id);
  const response = await fixtureLogin(base, email, password);
  expect(response.status).toBe(200);
  return {
    id: result.user.id,
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; "),
  };
}
async function planned(
  brief = "Landing page untuk studio desain, berisi layanan, portofolio, kontak WhatsApp. Tanpa login atau pembayaran. Tampilan mobile dan warna hijau. Target pengguna pemilik usaha kecil.",
) {
  const response = await request("/projects", "POST", {
    name: "Integration fixture",
    webType: "landing",
    brief,
  });
  expect(response.status).toBe(201);
  const { project } = await response.json();
  const queued = await request(`/projects/${project.id}/plans`, "POST", {
    briefVersion: project.briefVersion,
  });
  expect(queued.status).toBe(202);
  const ready = await waitFor(
    () =>
      db.project.findUniqueOrThrow({
        where: { id: project.id },
        include: { plans: { orderBy: { version: "desc" }, take: 1 } },
      }),
    (p) => ["plan_ready", "needs_clarification"].includes(p.status),
  );
  return ready;
}

beforeAll(async () => {
  if (process.env.MOCK_LLM !== "true")
    throw new Error("Integration requires MOCK_LLM=true");
  const first = await fixture(),
    other = await fixture();
  userId = first.id;
  cookie = first.cookie;
  otherCookie = other.cookie;
  await control({});
});
afterAll(async () => {
  await control({});
  for (const id of fixtureIds) {
    const projects = await db.project.findMany({
      where: { userId: id },
      select: { id: true },
    });
    const jobs = await db.job.findMany({
      where: { userId: id },
      select: { id: true },
    });
    const tasks = await db.planningTask.findMany({
      where: { projectId: { in: projects.map((p) => p.id) } },
      select: { id: true },
    });
    await db.outboxEvent.deleteMany({
      where: { resourceId: { in: [...jobs, ...tasks].map((j) => j.id) } },
    });
    await db.idempotencyKey.deleteMany({ where: { userId: id } });
    await db.job.deleteMany({ where: { userId: id } });
    await db.plan.deleteMany({
      where: { projectId: { in: projects.map((p) => p.id) } },
    });
    await clearTestBilling(id);
    await db.user.delete({ where: { id } });
    await db.usageDaily.deleteMany({ where: { userId: id } });
    await db.auditEvent.deleteMany({ where: { userId: id } });
  }
  await db.$disconnect();
});

describe("native authenticated workflow", () => {
  it("exports all 42 selected documents plus exactly one manifest", async () => {
    const project = await planned();
    let version = 1;
    for (const file of catalog) {
      const plan = await changePlan(userId, project.id, version, file.id, true);
      version = plan.version;
    }
    const { id } = await startJob(
      userId,
      project.id,
      version,
      "full-catalog-key",
    );
    const completed = await jobDone(id);
    expect(completed.status).toBe("succeeded");
    expect(completed.done).toBe(42);
    const response = await request(`/jobs/${id}/download`);
    expect(response.status).toBe(200);
    expect(
      zipEntries(Buffer.from(await response.arrayBuffer())).sort(),
    ).toEqual([...catalog.map((f) => f.path), "specs/manifest.json"].sort());
  });
  it("denies unauthenticated access, invalid signup, cross-account reads, hostile Origin, oversized input", async () => {
    expect((await request("/projects", "GET", undefined, "")).status).toBe(401);
    expect(
      (await request("/jobs/missing/download", "GET", undefined, "")).status,
    ).toBe(401);
    expect(
      (
        await request(
          "/auth/sign-up/email",
          "POST",
          {
            name: "No",
            email: "invalid-email",
            password: "password-not-allowed",
          },
          "",
        )
      ).status,
    ).toBeGreaterThanOrEqual(400);
    const project = await planned();
    expect(
      (await request(`/projects/${project.id}`, "GET", undefined, otherCookie))
        .status,
    ).toBe(404);
    const payment = await db.payment.findFirstOrThrow({ where: { userId } });
    expect(
      (await request(`/billing/${payment.id}`, "GET", undefined, otherCookie))
        .status,
    ).toBe(404);
    expect(
      (
        await request(
          `/projects/${project.id}/revisions`,
          "GET",
          undefined,
          otherCookie,
        )
      ).status,
    ).toBe(404);
    const preset = await db.briefPreset.create({
      data: {
        userId,
        name: "Private integration preset",
        webType: "landing",
        brief: "A private project brief for this fixture account only.",
      },
    });
    expect(
      (await request(`/presets/${preset.id}`, "DELETE", undefined, otherCookie))
        .status,
    ).toBe(404);
    expect(
      (await (await request("/presets", "GET", undefined, otherCookie)).json())
        .presets,
    ).toEqual([]);
    expect(
      (
        await request("/projects", "POST", { webType: "landing" }, cookie, {
          Origin: "https://evil.test",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request("/projects", "POST", {
          webType: "landing",
          brief: "a".repeat(8001),
        })
      ).status,
    ).toBe(400);
    const bad = await request(`/projects/${project.id}/plan`, "PATCH", {
      version: 1,
      fileId: "prd",
      include: false,
    });
    expect(bad.status).toBe(400);
    const updated = await request(`/projects/${project.id}`, "PATCH", {
      briefVersion: 1,
      brief:
        "Updated brief for landing website with clear requirements and contact form.",
    });
    expect(updated.status).toBe(200);
    expect(
      (
        await request(`/projects/${project.id}`, "PATCH", {
          briefVersion: 1,
          name: "conflict",
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await request(
          `/projects/${project.id}/jobs`,
          "POST",
          { planVersion: 1 },
          cookie,
          { "Idempotency-Key": "stale-plan-key" },
        )
      ).status,
    ).toBe(409);
  });
  it("clarifies at most once and rejects old versions", async () => {
    const project = await planned("Website jasa desain sederhana.");
    expect(project.status).toBe("needs_clarification");
    const response = await request(
      `/projects/${project.id}/clarification`,
      "POST",
      {
        briefVersion: 1,
        answers: ["UMKM", "Layanan dan kontak", "Mendapat prospek"],
      },
    );
    expect(response.status).toBe(200);
    expect(
      (
        await request(`/projects/${project.id}/clarification`, "POST", {
          briefVersion: 2,
          answers: [],
        })
      ).status,
    ).toBe(409);
    await request(`/projects/${project.id}/plans`, "POST", { briefVersion: 2 });
    expect(
      (
        await waitFor(
          () => db.project.findUniqueOrThrow({ where: { id: project.id } }),
          (p) => p.status !== "planning",
        )
      ).status,
    ).toBe("plan_ready");
  });
  it("health failure creates no job or usage; parallel idempotent starts consume one quota; export matches plan", async () => {
    const project = await planned();
    await control({ mode: "empty-models" });
    await expect(
      startJob(userId, project.id, 1, "health-failure-key"),
    ).rejects.toMatchObject({ code: "LLM_MODEL_MISSING" });
    expect(await db.job.count({ where: { projectId: project.id } })).toBe(0);
    await control({});
    const jobs = await Promise.all([
      startJob(userId, project.id, 1, "parallel-start-key"),
      startJob(userId, project.id, 1, "parallel-start-key"),
    ]);
    expect(jobs[0].id).toBe(jobs[1].id);
    expect(
      (await startJob(userId, project.id, 1, "another-active-click")).id,
    ).toBe(jobs[0].id);
    expect(
      (
        await db.usagePeriod.findUniqueOrThrow({
          where: { userId_key: { userId, key: weekPeriod().key } },
        })
      ).jobsCount,
    ).toBe(2);
    const job = await jobDone(jobs[0].id);
    expect(job.status).toBe("succeeded");
    expect(job.done).toBe(job.total);
    await control({ mode: "auth" });
    expect(
      (await startJob(userId, project.id, 1, "parallel-start-key")).id,
    ).toBe(job.id);
    expect(
      (await startJob(userId, project.id, 1, "another-active-click")).id,
    ).toBe(job.id);
    await control({});
    const zip = await request(`/jobs/${job.id}/download`);
    expect(zip.status).toBe(200);
    expect(zip.headers.get("content-type")).toBe("application/zip");
    const archive = Buffer.from(await zip.arrayBuffer());
    expect(archive.byteLength).toBeGreaterThan(1000);
    const snapshot = job.snapshot as unknown as Snapshot;
    expect(zipEntries(archive).sort()).toEqual(
      [
        ...snapshot.plan.selected.map((file) => file.path),
        "specs/manifest.json",
      ].sort(),
    );
    expect(
      (job.manifest as { files: { path: string }[] }).files
        .map((f) => f.path)
        .sort(),
    ).toEqual(
      [
        ...snapshot.plan.selected.map((f) => f.path),
        "specs/manifest.json",
      ].sort(),
    );
    expect(
      (
        await request(
          `/jobs/${job.id}/files/prd`,
          "GET",
          undefined,
          otherCookie,
        )
      ).status,
    ).toBe(404);
    await expect(
      startJob(userId, project.id, 2, "parallel-start-key"),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("partial output blocks broken ZIP; resume retains successful checkpoints and quota", async () => {
    const project = await planned();
    await control({ failFile: "security" });
    const { id } = await startJob(userId, project.id, 1, "partial-start-key");
    const partial = await jobDone(id);
    expect(partial.status).toBe("partial");
    expect(partial.files.find((f) => f.fileId === "security")?.status).toBe(
      "failed",
    );
    expect((await request(`/jobs/${id}/download`)).status).toBe(409);
    const checkpoint = partial.files.find((f) => f.fileId === "prd")!;
    const quota = (
      await db.usagePeriod.findUniqueOrThrow({
        where: { userId_key: { userId, key: weekPeriod().key } },
      })
    ).jobsCount;
    await control({});
    const subscription = await db.subscription.findFirstOrThrow({
      where: { userId },
    });
    await db.subscription.update({
      where: { id: subscription.id },
      data: { endsAt: new Date(Date.now() - 1000) },
    });
    try {
      expect((await entitlementFor(userId)).planId).toBe("free");
      const resumed = await Promise.all([
        resumeJob(userId, id, "resume-same-key"),
        resumeJob(userId, id, "resume-same-key"),
      ]);
      expect(resumed[0]).toEqual(resumed[1]);
    } finally {
      await db.subscription.update({
        where: { id: subscription.id },
        data: { endsAt: subscription.endsAt },
      });
    }
    const completed = await jobDone(id);
    expect(completed.status).toBe("succeeded");
    expect(completed.retentionDays).toBe(180);
    const prd = completed.files.find((f) => f.fileId === "prd")!;
    expect(prd.checksum).toBe(checkpoint.checksum);
    expect(prd.attempts).toBe(checkpoint.attempts);
    expect(
      (
        await db.usagePeriod.findUniqueOrThrow({
          where: { userId_key: { userId, key: weekPeriod().key } },
        })
      ).jobsCount,
    ).toBe(quota);
    await control({ mode: "auth" });
    expect(await resumeJob(userId, id, "resume-same-key")).toEqual({ id });
    await control({});
  });
  it("cancels an in-flight request without new requests or cancelled downloads", async () => {
    const project = await planned();
    await control({ delay: 4000 });
    const { id } = await startJob(userId, project.id, 1, "cancel-start-key");
    await waitFor(
      () => db.job.findUniqueOrThrow({ where: { id } }),
      (j) => j.status === "running" && j.llmRequestCount > 0,
    );
    expect((await request(`/jobs/${id}/cancel`, "POST", {})).status).toBe(202);
    const cancelled = await jobDone(id);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.llmRequestCount).toBe(1);
    expect((await request(`/jobs/${id}/download`)).status).toBe(409);
    await control({});
  });
  it("recovers an expired lease, fences duplicate execution, then resumes existing checkpoints", async () => {
    const project = await planned();
    const previous = await db.job.findFirstOrThrow({
      where: { userId, status: "succeeded", total: { lt: 30 } },
      include: { files: true },
    });
    const snap = previous.snapshot as unknown as Snapshot;
    const job = await db.job.create({
      data: {
        userId,
        projectId: project.id,
        planId: project.plans[0].id,
        total: snap.plan.selected.length,
        status: "running",
        snapshot: json(snap),
        leaseOwner: "dead-worker",
        leaseVersion: 1,
        leaseExpiresAt: new Date(Date.now() - 1000),
        files: {
          create: snap.plan.selected.map((f) => ({
            fileId: f.id,
            ...(f.id === "brief"
              ? {
                  status: "succeeded",
                  content: "# Brief\nRecovered checkpoint",
                  attempts: 1,
                  checksum: "checkpoint",
                }
              : {}),
          })),
        },
      },
    });
    await expect(
      db.job.create({
        data: {
          userId,
          projectId: project.id,
          planId: project.plans[0].id,
          total: 1,
          snapshot: json(snap),
          status: "queued",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    await maintenance();
    expect(
      (await db.job.findUniqueOrThrow({ where: { id: job.id } })).errorCode,
    ).toBe("WORKER_INTERRUPTED");
    await resumeJob(userId, job.id, "lease-resume-key");
    await Promise.all([generateJob(job.id), generateJob(job.id)]);
    const done = await jobDone(job.id);
    expect(done.status).toBe("succeeded");
    expect(done.files.find((f) => f.fileId === "brief")?.checksum).toBe(
      "checkpoint",
    );
  });
  it("recovers a queued domain job whose queue delivery was lost", async () => {
    const project = await planned();
    const previous = await db.job.findFirstOrThrow({
      where: { userId, status: "succeeded", total: { lt: 30 } },
    });
    const snapshot = previous.snapshot as unknown as Snapshot;
    const job = await db.job.create({
      data: {
        userId,
        projectId: project.id,
        planId: project.plans[0].id,
        total: snapshot.plan.selected.length,
        snapshot: json(snapshot),
        heartbeatAt: new Date(Date.now() - 1000000),
        files: {
          create: snapshot.plan.selected.map((file) => ({ fileId: file.id })),
        },
      },
    });
    expect(await db.outboxEvent.count({ where: { resourceId: job.id } })).toBe(
      0,
    );
    await maintenance();
    expect(await db.outboxEvent.count({ where: { resourceId: job.id } })).toBe(
      1,
    );
    expect((await jobDone(job.id)).status).toBe("succeeded");
  });
});
