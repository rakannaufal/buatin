import { describe, expect, it } from "vitest";
import {
  permitted,
  suspended,
  discountFor,
  voucherSchema,
  planEditSchema,
  planFeatures,
} from "../../src/domain/admin";
import { redactAudit, redactText } from "../../src/domain/audit";
import { csvCell } from "../../src/server/admin/reports";

describe("admin policy boundaries", () => {
  it("reserves staff, refund approval and budget controls for owners", () => {
    for (const permission of ["staff", "refund.approve", "controls"] as const) {
      expect(permitted("owner", permission)).toBe(true);
      expect(permitted("admin", permission)).toBe(false);
      expect(permitted("user", permission)).toBe(false);
    }
    expect(permitted("admin", "vouchers")).toBe(true);
    expect(permitted("user", "read")).toBe(false);
    expect(permitted("superadmin", "read")).toBe(false);
  });
  it("expires timed suspensions while retaining permanent suspensions", () => {
    const now = new Date("2026-10-21T00:00:00Z");
    expect(suspended({ status: "suspended", suspendedUntil: null }, now)).toBe(
      true,
    );
    expect(suspended({ status: "suspended", suspendedUntil: now }, now)).toBe(
      false,
    );
    expect(
      suspended(
        { status: "suspended", suspendedUntil: new Date(now.getTime() + 1) },
        now,
      ),
    ).toBe(true);
  });
  it("rounds discounts down to integer rupiah and enforces caps", () => {
    expect(
      discountFor(12345, { kind: "percent", value: 17, maximumDiscount: null }),
    ).toBe(2098);
    expect(
      discountFor(10000, { kind: "percent", value: 99, maximumDiscount: 500 }),
    ).toBe(500);
    expect(
      discountFor(10000, {
        kind: "fixed",
        value: 20000,
        maximumDiscount: null,
      }),
    ).toBe(10000);
  });
  it("rejects free QRIS coupons, reversed periods and per-account oversubscription", () => {
    const value = {
      code: " promo_25 ",
      title: "Promotion",
      status: "active",
      kind: "percent",
      value: 25,
      minimumAmount: 0,
      maximumDiscount: null,
      maxUses: 2,
      perUserLimit: 1,
      newCustomersOnly: false,
      planIds: ["plus"],
      userIds: [],
      startsAt: "2026-10-01T00:00:00Z",
      endsAt: "2026-11-01T00:00:00Z",
    };
    expect(voucherSchema.parse(value).code).toBe("PROMO_25");
    expect(voucherSchema.safeParse({ ...value, value: 100 }).success).toBe(
      false,
    );
    expect(voucherSchema.safeParse({ ...value, perUserLimit: 3 }).success).toBe(
      false,
    );
    expect(
      voucherSchema.safeParse({ ...value, endsAt: value.startsAt }).success,
    ).toBe(false);
    expect(voucherSchema.safeParse({ ...value, kind: "script" }).success).toBe(
      false,
    );
  });
  it("requires typed benefits and a price before selling", () => {
    const value = {
      name: "Plus",
      description: "",
      monthlyPrice: null,
      available: false,
      weeklyQuota: 10,
      retentionDays: 90,
      priority: 2,
      plannerLimit: 40,
      features: planFeatures("plus"),
    };
    expect(planEditSchema.safeParse(value).success).toBe(true);
    expect(
      planEditSchema.safeParse({ ...value, available: true }).success,
    ).toBe(false);
    expect(planEditSchema.safeParse({ ...value, weeklyQuota: 0 }).success).toBe(
      false,
    );
    expect(planFeatures("plus", { ...value.features, batch: true }).batch).toBe(
      true,
    );
  });
  it("redacts nested credentials and inline keys while preserving voucher codes", () => {
    expect(
      redactAudit({
        password: "private",
        nested: [
          {
            authorization: "private",
            code: "PROMO25",
            reason: "token=private sk-fixture123456789 Bearer private",
          },
        ],
        at: new Date("2026-10-21T00:00:00Z"),
      }),
    ).toEqual({
      password: "[REDACTED]",
      nested: [
        {
          authorization: "[REDACTED]",
          code: "PROMO25",
          reason: "token=[REDACTED] [REDACTED] Bearer [REDACTED]",
        },
      ],
      at: "2026-10-21T00:00:00.000Z",
    });
    expect(
      redactText(
        "access_token=private refreshToken=private totp=123456 postgres://user:private@localhost/db",
      ),
    ).toBe(
      "access_token=[REDACTED] refreshToken=[REDACTED] totp=[REDACTED] postgres://[REDACTED]@localhost/db",
    );
  });
  it("neutralizes spreadsheet formulas and quotes CSV cells", () => {
    for (const value of ["=SUM(A1)", " +cmd", "@sum(A1)", "\tformula", "-1"])
      expect(csvCell(value)).toMatch(/^"'/);
    expect(csvCell('Normal, "value"')).toBe('"Normal, ""value"""');
  });
});
