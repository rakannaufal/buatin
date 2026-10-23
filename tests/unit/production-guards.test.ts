import { afterEach, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { hasSecret } from "../../src/domain/lint";
const { setting } = vi.hoisted(() => ({ setting: vi.fn() }));
vi.mock("../../src/server/db", () => ({
  db: { setting: { findUnique: setting } },
}));
import { requireWorkerReady } from "../../src/server/worker-status";
import { hostedConfigurationIssues } from "../../src/server/hosted";
afterEach(() => vi.unstubAllEnvs());
it("rejects credential hashes, private keys and remote database passwords without real secrets", () => {
  expect(
    hasSecret(
      `${randomBytes(16).toString("hex")}:${randomBytes(64).toString("hex")}`,
    ),
  ).toBe(true);
  expect(hasSecret(["-----BEGIN", "PRIVATE KEY-----"].join(" "))).toBe(true);
  expect(
    hasSecret(
      [
        "postgresql://fixture:",
        randomBytes(24).toString("hex"),
        "@database.example/app",
      ].join(""),
    ),
  ).toBe(true);
  expect(
    hasSecret("postgresql://fixture:ci-fixture-only@127.0.0.1:5432/app"),
  ).toBe(false);
});
it("blocks unavailable, stale and future worker heartbeats", async () => {
  for (const value of [
    null,
    { updatedAt: new Date(Date.now() - 31000) },
    { updatedAt: new Date(Date.now() + 10000) },
  ]) {
    setting.mockResolvedValue(value);
    await expect(requireWorkerReady()).rejects.toMatchObject({
      code: "WORKER_UNAVAILABLE",
      status: 503,
    });
  }
  setting.mockResolvedValue({ updatedAt: new Date() });
  await expect(requireWorkerReady()).resolves.toBeUndefined();
});
it("does not require optional AI credentials for deterministic document generation", () => {
  vi.stubEnv("LLM_VISION_MODEL", "");
  vi.stubEnv("NINEROUTER_API_KEY", "");
  vi.stubEnv("LLM_MODEL_PLANNER", "");
  vi.stubEnv("LLM_MODEL_WRITER", "");
  expect(
    hostedConfigurationIssues("worker").some(
      (issue) => issue.startsWith("AI:") || issue.startsWith("LLM_BASE_URL:"),
    ),
  ).toBe(false);
  vi.stubEnv("LLM_VISION_MODEL", "fixture-vision");
  expect(
    hostedConfigurationIssues("worker").some((issue) =>
      issue.startsWith("AI:"),
    ),
  ).toBe(true);
});
