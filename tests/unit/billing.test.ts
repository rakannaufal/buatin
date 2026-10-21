import { describe, expect, it } from "vitest";
import {
  weekPeriod,
  addBillingMonth,
  hasFeature,
  regenerationClosure,
  queueScore,
} from "../../src/domain/billing";
import { signDuitku, validDuitkuSignature } from "../../src/server/duitku";
describe("calendar entitlements", () => {
  it("resets exactly Monday 00:00 WIB, independently of server timezone", () => {
    expect(weekPeriod(new Date("2026-10-25T16:59:59.999Z")).key).toBe(
      "week:2026-10-19",
    );
    const monday = weekPeriod(new Date("2026-10-25T17:00:00Z"));
    expect(monday.key).toBe("week:2026-10-26");
    expect(monday.startsAt.toISOString()).toBe("2026-10-25T17:00:00.000Z");
    expect(monday.endsAt.toISOString()).toBe("2026-11-01T17:00:00.000Z");
  });
  it("handles year boundaries and Sunday morning", () => {
    expect(weekPeriod(new Date("2027-01-01T00:00:00Z")).key).toBe(
      "week:2026-12-28",
    );
    expect(weekPeriod(new Date("2026-10-25T00:00:00Z")).key).toBe(
      "week:2026-10-19",
    );
  });
  it("adds calendar months with month-end clamping, preserving WIB time", () => {
    expect(
      addBillingMonth(new Date("2026-01-31T09:12:13Z")).toISOString(),
    ).toBe("2026-02-28T09:12:13.000Z");
    expect(
      addBillingMonth(new Date("2028-01-31T09:12:13Z")).toISOString(),
    ).toBe("2028-02-29T09:12:13.000Z");
    expect(
      addBillingMonth(new Date("2026-12-31T18:00:00Z")).toISOString(),
    ).toBe("2027-01-31T18:00:00.000Z");
  });
  it("does not turn a month into a fixed 30 days", () => {
    expect(
      addBillingMonth(new Date("2026-07-01T00:00:00Z")).getTime() -
        new Date("2026-07-01T00:00:00Z").getTime(),
    ).toBe(31 * 86400000);
  });
  it("enforces feature tiers", () => {
    expect(hasFeature("starter", "regeneration")).toBe(false);
    expect(hasFeature("plus", "regeneration")).toBe(true);
    expect(hasFeature("plus", "templates")).toBe(false);
    expect(hasFeature("max", "templates")).toBe(true);
    expect(hasFeature("free", "batch")).toBe(false);
  });
  it("propagates regenerated context through all downstream selected documents", () => {
    const entries = [
      { id: "brief", requires: [], context_from: [] },
      { id: "prd", requires: ["brief"], context_from: [] },
      { id: "api", requires: [], context_from: ["prd"] },
      { id: "other", requires: [], context_from: [] },
    ];
    expect(
      regenerationClosure(["brief"], ["brief", "prd", "api", "other"], entries),
    ).toEqual(["brief", "prd", "api"]);
    expect(() => regenerationClosure(["absent"], ["brief"], entries)).toThrow(
      "INVALID_SELECTION",
    );
  });
  it("lets waiting standard jobs overtake newly arriving priority jobs", () => {
    const now = new Date("2026-10-20T10:00:00Z");
    expect(
      queueScore(0, new Date(now.getTime() - 21 * 60000), now),
    ).toBeGreaterThan(queueScore(20, now, now));
  });
});
describe("Duitku HMAC", () => {
  it("uses HMAC SHA256, rejects altered signatures and malformed lengths", () => {
    const signature = signDuitku("DTEST10000BTorder", "test-key");
    expect(signature).toHaveLength(64);
    expect(
      validDuitkuSignature("DTEST10000BTorder", signature, "test-key"),
    ).toBe(true);
    expect(
      validDuitkuSignature("DTEST20000BTorder", signature, "test-key"),
    ).toBe(false);
    expect(validDuitkuSignature("DTEST10000BTorder", "0", "test-key")).toBe(
      false,
    );
    expect(
      validDuitkuSignature("DTEST10000BTorder", "x".repeat(64), "test-key"),
    ).toBe(false);
  });
});
