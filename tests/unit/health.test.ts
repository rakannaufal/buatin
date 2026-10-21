import { afterEach, expect, it, vi } from "vitest";
const query = vi.hoisted(() => vi.fn());
vi.mock("pg", () => ({
  Pool: class {
    query = query;
    on() {}
  },
}));
afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});
it("rejects a stale worker and database failures; accepts live dependencies", async () => {
  const { readiness } = await import("../../src/server/health");
  const clock = vi.spyOn(Date, "now").mockReturnValue(100000);
  query.mockResolvedValueOnce({
    rows: [{ worker_at: new Date(99999), unfinished: "0", migrated: true }],
  });
  await expect(readiness()).resolves.toEqual({
    ok: true,
    database: true,
    worker: true,
  });
  clock.mockReturnValue(102000);
  query.mockResolvedValueOnce({
    rows: [{ worker_at: new Date(1000), unfinished: "0", migrated: true }],
  });
  await expect(readiness()).resolves.toEqual({
    ok: false,
    database: true,
    worker: false,
  });
  clock.mockReturnValue(104000);
  query.mockRejectedValueOnce(new Error("fixture outage"));
  await expect(readiness()).resolves.toEqual({
    ok: false,
    database: false,
    worker: false,
  });
});
