import { expect, it, afterEach, vi } from "vitest";
import { needsProcessing } from "../../src/domain/processing";
import { getEnv } from "../../src/server/config";
afterEach(() => vi.unstubAllEnvs());
it("only continues pending workspace status reads, never downloads or unrelated endpoints", () => {
  expect(
    needsProcessing("/jobs/owned-job", { job: { status: "queued" } }),
  ).toBe(true);
  expect(
    needsProcessing("/projects?page=1", {
      projects: [{ status: "generating" }],
    }),
  ).toBe(true);
  expect(
    needsProcessing("/projects/owned-project/attachments", {
      attachments: [{ status: "processing" }],
    }),
  ).toBe(true);
  expect(
    needsProcessing("/projects/owned-project", {
      project: { status: "completed" },
    }),
  ).toBe(false);
  for (const path of [
    "/jobs/owned/download",
    "/admin/jobs",
    "/billing",
    "/jobs/owned/extra",
    "/session",
  ])
    expect(needsProcessing(path, { job: { status: "queued" } })).toBe(false);
});
it("defaults Vercel to bounded request processing while retaining explicit worker mode", () => {
  vi.stubEnv("VERCEL", "1");
  delete process.env.PROCESSING_MODE;
  expect(getEnv().PROCESSING_MODE).toBe("request");
  vi.stubEnv("PROCESSING_MODE", "worker");
  expect(getEnv().PROCESSING_MODE).toBe("worker");
});
