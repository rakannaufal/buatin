import { afterEach, expect, it, vi } from "vitest";
import { workerScannerReady } from "../../src/server/worker-status";

const find = vi.hoisted(() => vi.fn());
vi.mock("../../src/server/db", () => ({
  db: { setting: { findUnique: find } },
}));
afterEach(() => vi.restoreAllMocks());

it("uses fresh worker capabilities rather than the web host scanner path", async () => {
  vi.spyOn(Date, "now").mockReturnValue(100000);
  for (const heartbeat of [
    null,
    { value: { scanner: true }, updatedAt: new Date(69999) },
    { value: { scanner: true }, updatedAt: new Date(100001) },
    { value: { at: "legacy-heartbeat" }, updatedAt: new Date(99999) },
    { value: { scanner: false }, updatedAt: new Date(99999) },
  ]) {
    find.mockResolvedValue(heartbeat);
    await expect(workerScannerReady()).resolves.toBe(false);
  }
  find.mockResolvedValue({
    value: { scanner: true },
    updatedAt: new Date(99999),
  });
  await expect(workerScannerReady()).resolves.toBe(true);
});
