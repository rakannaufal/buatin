import { describe, expect, it } from "vitest";
import { defaultSite, siteSchema } from "../../src/domain/admin";
import { publicContact } from "../../src/domain/legal";

describe("public operator details", () => {
  it("keeps existing site settings readable without inventing an identity", () => {
    const legacy = {
      announcement: "Service notice",
      supportEmail: "",
      faq: "Additional help",
      privacyNotice: "Privacy notice",
      termsNotice: "Terms notice",
    };
    expect(siteSchema.parse(legacy)).toEqual({
      ...legacy,
      operatorName: "",
      operatorAddress: "",
    });
    expect(publicContact(defaultSite, "")).toEqual({
      name: "",
      address: "",
      email: "",
    });
  });

  it("uses the configured public email before the environment fallback", () => {
    const site = siteSchema.parse({
      ...defaultSite,
      operatorName: "  Fixture operator  ",
      operatorAddress: "  Correspondence address\nSecond line  ",
      supportEmail: "help@localhost.test",
    });
    expect(publicContact(site, "fallback@localhost.test")).toEqual({
      name: "Fixture operator",
      address: "Correspondence address\nSecond line",
      email: "help@localhost.test",
    });
    expect(publicContact(defaultSite, "fallback@localhost.test").email).toBe(
      "fallback@localhost.test",
    );
  });

  it("bounds public identity fields and rejects unsupported settings", () => {
    expect(
      siteSchema.safeParse({ ...defaultSite, operatorName: "x".repeat(161) })
        .success,
    ).toBe(false);
    expect(
      siteSchema.safeParse({
        ...defaultSite,
        operatorAddress: "x".repeat(1001),
      }).success,
    ).toBe(false);
    expect(
      siteSchema.safeParse({ ...defaultSite, privateKey: "fixture" }).success,
    ).toBe(false);
  });
});
