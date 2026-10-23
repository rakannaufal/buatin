import { beforeAll, afterAll, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { db, json } from "../../src/server/db";
import type { Snapshot } from "../../src/domain/types";
import { createAuth } from "../../src/server/auth";
import { grantTestPlan, clearTestBilling } from "../helpers/saas";
import { fixtureLogin } from "../helpers/http";
import { readPreferences } from "../../src/domain/preferences";
import { removeReference } from "../../src/server/reference-storage";

const base = process.env.APP_URL!;
const users: string[] = [];
let cookie = "",
  otherCookie = "",
  userId = "";
async function request(
  path: string,
  method = "GET",
  data?: unknown,
  session = cookie,
  extra: Record<string, string> = {},
) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Cookie: session,
      Origin: base,
      "Content-Type": "application/json",
      ...extra,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
async function fixture() {
  const password = randomBytes(24).toString("hex"),
    email = `request-${crypto.randomUUID()}@localhost.test`;
  const account = await createAuth(true).api.signUpEmail({
    body: { name: "Request fixture", email, password },
  });
  users.push(account.user.id);
  await db.user.update({
    where: { id: account.user.id },
    data: { emailVerified: true },
  });
  await grantTestPlan(account.user.id);
  const response = await fixtureLogin(base, email, password);
  expect(response.status).toBe(200);
  return {
    id: account.user.id,
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; "),
  };
}
beforeAll(async () => {
  const state = await (await fetch(`${base}/api/public-config`)).json();
  if (state.processingMode !== "request" || state.mock !== true)
    throw new Error("Requires isolated request-mode fixture without a worker");
  const first = await fixture(),
    second = await fixture();
  userId = first.id;
  cookie = first.cookie;
  otherCookie = second.cookie;
});
afterAll(async () => {
  for (const id of users) {
    const projects = await db.project.findMany({
      where: { userId: id },
      include: { jobs: true, tasks: true, attachments: true },
    });
    const resources = projects.flatMap((p) =>
      [...p.jobs, ...p.tasks, ...p.attachments].map((r) => r.id),
    );
    for (const attachment of projects.flatMap((p) => p.attachments))
      await removeReference(attachment.storageKey);
    await db.outboxEvent.deleteMany({
      where: { resourceId: { in: resources } },
    });
    await db.setting.deleteMany({ where: { key: `processing:${id}` } });
    await clearTestBilling(id);
    await db.user.delete({ where: { id } });
  }
});

it("protects continuation with session, Origin, exact methods and strict input", async () => {
  expect((await request("/processing", "POST", {}, "")).status).toBe(401);
  expect(
    (
      await request("/processing", "POST", {}, cookie, {
        Origin: "https://other.example",
      })
    ).status,
  ).toBe(403);
  expect(
    (await request("/processing", "POST", { userId: "another-account" }))
      .status,
  ).toBe(400);
  expect((await request("/processing", "HEAD")).status).toBe(405);
  expect((await request("/processing", "OPTIONS")).status).toBe(204);
  expect((await request("/processing/extra", "POST", {})).status).toBe(404);
  expect((await request("/health/ready")).status).toBe(200);
});

it("plans, checkpoints, recovers expired leases and exports without a worker or double quota", async () => {
  const project = await db.project.create({
    data: {
      userId,
      name: "Request profile fixture",
      webType: "saas",
      clarified: true,
      expiresAt: new Date(Date.now() + 86400000),
      brief:
        "SaaS manajemen proyek Indonesia untuk tim kecil, dashboard, laporan, undangan anggota, akses per role, ekspor data dan notifikasi. Gunakan Next.js, PostgreSQL, desain hijau, mobile responsif, target rilis MVP.",
    },
  });
  const queued = await request(`/projects/${project.id}/plans`, "POST", {
    briefVersion: project.briefVersion,
  });
  expect(queued.status).toBe(202);
  // Status GET/HEAD are genuinely read-only, including when work is queued.
  await request(`/projects/${project.id}`);
  await request(`/projects/${project.id}`, "HEAD");
  expect(await db.plan.count({ where: { projectId: project.id } })).toBe(0);
  await request("/processing", "POST", {}, otherCookie);
  expect(await db.plan.count({ where: { projectId: project.id } })).toBe(0);
  await db.planningTask.updateMany({
    where: { projectId: project.id },
    data: { status: "running", heartbeatAt: new Date(0) },
  });
  expect((await request("/processing", "POST", {})).status).toBe(200);
  expect(await db.plan.count({ where: { projectId: project.id } })).toBe(1);
  const plan = await db.plan.findFirstOrThrow({
    where: { projectId: project.id },
  });
  const key = crypto.randomUUID();
  const start = () =>
    request(
      `/projects/${project.id}/jobs`,
      "POST",
      { planVersion: plan.version },
      cookie,
      { "Idempotency-Key": key },
    );
  const initial = await start();
  expect(initial.status).toBe(202);
  const { job } = await initial.json();
  expect((await (await start()).json()).job.id).toBe(job.id);
  await request("/processing", "POST", {});
  const checkpoint = await db.job.findUniqueOrThrow({
    where: { id: job.id },
    include: { files: true },
  });
  expect(checkpoint.status).toBe("queued");
  expect(checkpoint.done).toBeGreaterThan(0);
  expect(checkpoint.done).toBeLessThanOrEqual(6);
  const saved = checkpoint.files.filter((f) => f.status === "succeeded");
  await db.job.update({
    where: { id: job.id },
    data: {
      status: "running",
      leaseOwner: "terminated-fixture",
      leaseExpiresAt: new Date(0),
    },
  });
  const responses = await Promise.all([
    request("/processing", "POST", {}),
    request("/processing", "POST", {}),
  ]);
  expect(responses.every((r) => r.status === 200)).toBe(true);
  expect(
    (await db.job.findUniqueOrThrow({ where: { id: job.id } })).done,
  ).toBeGreaterThan(checkpoint.done);
  for (let i = 0; i < 10; i++) {
    const state = await db.job.findUniqueOrThrow({ where: { id: job.id } });
    if (["succeeded", "partial", "failed"].includes(state.status)) break;
    expect((await request("/processing", "POST", {})).status).toBe(200);
  }
  const final = await db.job.findUniqueOrThrow({
    where: { id: job.id },
    include: { files: true },
  });
  expect(final.status).toBe("succeeded");
  expect(final.done).toBe(final.total);
  for (const file of saved)
    expect(final.files.find((f) => f.fileId === file.fileId)?.checksum).toBe(
      file.checksum,
    );
  expect(await db.quotaLedger.count({ where: { jobId: job.id } })).toBe(1);
  expect(
    (await request(`/jobs/${job.id}/download`, "GET", undefined, otherCookie))
      .status,
  ).toBe(404);
  const download = await request(`/jobs/${job.id}/download`);
  expect(download.status).toBe(200);
  expect(
    Buffer.from(await download.arrayBuffer())
      .subarray(0, 2)
      .toString(),
  ).toBe("PK");
});

it("processes private text references, refuses PDF before writing and prevents suspended continuation", async () => {
  const project = await db.project.create({
    data: {
      userId,
      name: "Reference fixture",
      webType: "landing",
      brief: "Landing page dengan referensi dokumen privat.",
      preferences: readPreferences({}),
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  const upload = (name: string, data: string) =>
    fetch(`${base}/api/projects/${project.id}/attachments`, {
      method: "POST",
      headers: {
        Origin: base,
        Cookie: cookie,
        "X-File-Name": name,
        "X-Brief-Version": String(project.briefVersion),
      },
      body: data,
    });
  expect((await upload("fixture.pdf", "%PDF-1.7\nfixture")).status).toBe(503);
  expect(
    await db.projectAttachment.count({ where: { projectId: project.id } }),
  ).toBe(0);
  const uploaded = await upload(
    "fixture.md",
    "# Private requirements\nMobile first with keyboard navigation.",
  );
  expect(uploaded.status).toBe(202);
  const { attachmentId } = await uploaded.json();
  await request("/processing", "POST", {});
  const attachment = await db.projectAttachment.findUniqueOrThrow({
    where: { id: attachmentId },
  });
  expect(attachment.status).toBe("ready");
  expect(attachment.text).toContain("Private requirements");
  expect(
    (
      await request(
        `/projects/${project.id}/attachments/${attachmentId}/download`,
        "GET",
        undefined,
        otherCookie,
      )
    ).status,
  ).toBe(404);
  await db.user.update({
    where: { id: userId },
    data: { status: "suspended" },
  });
  try {
    expect((await request("/processing", "POST", {})).status).toBe(403);
  } finally {
    await db.user.update({ where: { id: userId }, data: { status: "active" } });
  }
});

it("finishes partial output after a full slice of permanent failures instead of retrying forever", async () => {
  const source = await db.job.findFirstOrThrow({
    where: { userId, status: "succeeded" },
  });
  const snapshot = source.snapshot as unknown as Snapshot;
  const regenerated = await request(
    `/jobs/${source.id}/regenerate`,
    "POST",
    { fileIds: snapshot.plan.selected.map((f) => f.id) },
    cookie,
    { "Idempotency-Key": crypto.randomUUID() },
  );
  expect(regenerated.status).toBe(202);
  const id = (await regenerated.json()).job.id;
  const broken = structuredClone(snapshot);
  for (const file of broken.plan.selected.slice(0, 6))
    delete broken.templates[file.id];
  await db.job.update({ where: { id }, data: { snapshot: json(broken) } });
  for (let i = 0; i < 10; i++) {
    await request("/processing", "POST", {});
    if (
      (await db.job.findUniqueOrThrow({ where: { id } })).status === "partial"
    )
      break;
  }
  const final = await db.job.findUniqueOrThrow({ where: { id } });
  expect(final.status).toBe("partial");
  expect(final.failed).toBe(6);
  expect(final.done).toBe(final.total - 6);
});

it("serializes processor leases and never refunds cancelled work with saved output", async () => {
  const source = await db.job.findFirstOrThrow({
    where: { userId, status: "succeeded" },
  });
  const snapshot = source.snapshot as unknown as Snapshot;
  const response = await request(
    `/jobs/${source.id}/regenerate`,
    "POST",
    { fileIds: snapshot.plan.selected.map((f) => f.id) },
    cookie,
    { "Idempotency-Key": crypto.randomUUID() },
  );
  expect(response.status).toBe(202);
  const id = (await response.json()).job.id;
  const key = `processing:${userId}`;
  await db.setting.create({
    data: {
      key,
      value: { owner: "fixture-busy", expiresAt: Date.now() + 240000 },
    },
  });
  expect((await (await request("/processing", "POST", {})).json()).busy).toBe(
    true,
  );
  expect((await db.job.findUniqueOrThrow({ where: { id } })).done).toBe(0);
  await db.setting.update({
    where: { key },
    data: { value: { owner: "fixture-terminated", expiresAt: 0 } },
  });
  await request("/processing", "POST", {});
  expect(
    (await db.job.findUniqueOrThrow({ where: { id } })).done,
  ).toBeGreaterThan(0);
  await db.job.update({
    where: { id },
    data: {
      status: "cancel_requested",
      cancelRequestedAt: new Date(),
      leaseExpiresAt: new Date(0),
    },
  });
  await request("/processing", "POST", {});
  await request("/processing", "POST", {});
  const cancelled = await db.job.findUniqueOrThrow({ where: { id } });
  expect(cancelled.status).toBe("cancelled");
  expect(cancelled.quotaRefundedAt).toBeNull();
  expect(await db.quotaLedger.count({ where: { jobId: id } })).toBe(1);
});

it("requires the cron bearer secret, keeps HEAD inert and only expires eligible projects", async () => {
  expect((await request("/cron/maintenance")).status).toBe(401);
  expect((await request("/cron/maintenance", "HEAD")).status).toBe(405);
  const expired = await db.project.create({
    data: {
      userId,
      name: "Expired fixture",
      webType: "landing",
      brief: "Disposable expired fixture",
      expiresAt: new Date(0),
    },
  });
  const live = await db.project.create({
    data: {
      userId,
      name: "Live fixture",
      webType: "landing",
      brief: "Disposable live fixture",
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  const response = await request("/cron/maintenance", "GET", undefined, "", {
    Authorization: "Bearer test-only-cron-secret-not-for-production",
  });
  expect(response.status).toBe(200);
  expect(await db.project.findUnique({ where: { id: expired.id } })).toBeNull();
  expect(
    await db.project.findUnique({ where: { id: live.id } }),
  ).not.toBeNull();
});
