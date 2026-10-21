import { describe, expect, it } from "vitest";
import {
  defaultPreferences,
  readPreferences,
  preferencesSchema,
  resolvePreferences,
  preferenceConflicts,
  hexColor,
  contrastRatio,
} from "../../src/domain/preferences";
import {
  technologyCatalog,
  resolveTechnology,
  technologyConflicts,
} from "../../src/domain/technology";
import {
  skillCatalog,
  selectSkills,
  skillSelectionIssues,
} from "../../src/domain/skills";
import { webTypes } from "../../src/domain/catalog";
import {
  projectContext,
  planningBrief,
} from "../../src/domain/project-context";
import { applyCustomization } from "../../src/domain/customization-output";
import {
  loadingPolicy,
  loadingGuidance,
} from "../../src/domain/loading-policy";
import {
  detectReference,
  referenceMetadataSchema,
} from "../../src/domain/references";

describe("brief customization", () => {
  it("loads old drafts, isolates defaults and rejects unknown configuration", () => {
    expect(readPreferences({})).toEqual(readPreferences(null));
    const first = defaultPreferences();
    first.colors.palette[0].hex = "#FF0000";
    expect(defaultPreferences().colors.palette[0].hex).toBe("#235C46");
    expect(preferencesSchema.safeParse({ dangerous: true }).success).toBe(
      false,
    );
    expect(
      preferencesSchema.safeParse({
        technology: { choices: { frontend: "Imaginary framework" } },
      }).success,
    ).toBe(false);
  });
  it("normalizes HEX, enforces 2..10 colors and computes WCAG contrast", () => {
    expect(hexColor.parse("#aBc")).toBe("#AABBCC");
    expect(hexColor.safeParse("red").success).toBe(false);
    expect(hexColor.safeParse("#11223344").success).toBe(false);
    const colors = Array.from({ length: 10 }, (_, index) => ({
      name: `Color ${index}`,
      hex: "#abc",
    }));
    expect(
      preferencesSchema.parse({ colors: { mode: "manual", palette: colors } })
        .colors.palette,
    ).toHaveLength(10);
    expect(
      preferencesSchema.safeParse({
        colors: { palette: [...colors, colors[0]] },
      }).success,
    ).toBe(false);
    expect(
      preferencesSchema.safeParse({ colors: { palette: colors.slice(0, 1) } })
        .success,
    ).toBe(false);
    expect(contrastRatio("#000", "#FFF")).toBeCloseTo(21);
    expect(contrastRatio("#123456", "#123456")).toBe(1);
  });
  it("recommends coherent stacks for all nine types, ignoring inactive manual choices", () => {
    expect(technologyCatalog).toHaveLength(40);
    for (const web of webTypes) {
      const resolved = resolveTechnology(web.id, "auto", {
        frontend: "Vue",
        backend: "Laravel",
        database: "none",
      });
      expect(technologyConflicts(resolved)).toEqual([]);
      expect(resolved.frontend).not.toBe("Vue");
    }
    expect(resolveTechnology("blog", "auto", {}).frontend).toBe("Astro");
    expect(resolveTechnology("internal", "auto", {}).database).toBe(
      "PostgreSQL",
    );
  });
  it("adapts dependent recommendations without replacing manual locks", () => {
    const php = resolveTechnology("saas", "manual", {
      language: "PHP",
      frontend: "Vue",
    });
    expect(php).toMatchObject({
      backend: "Laravel",
      orm: "Eloquent",
      unitTesting: "PHPUnit/Pest",
      auth: "Laravel Sanctum/Fortify",
    });
    expect(technologyConflicts(php)).toEqual([]);
    const mongo = resolveTechnology("booking", "manual", {
      database: "MongoDB",
    });
    expect(mongo.orm).toBe("Mongoose");
    expect(mongo.queue).toBeUndefined();
    const invalid = defaultPreferences();
    invalid.technology = {
      mode: "manual",
      choices: { frontend: "Vue", components: "shadcn/ui" },
      additional: "",
    };
    expect(preferenceConflicts(invalid, "saas")).not.toEqual([]);
    expect(
      technologyConflicts({
        database: "none",
        queue: "pg-boss",
        orm: "Prisma",
      }),
    ).toHaveLength(2);
  });
  it("preserves manual design, validates font/numeric inputs and falls back after clearing", () => {
    const preferences = readPreferences({
      style: {
        mode: "manual",
        values: { layout: "Asymmetric", bodySize: 18, headingFont: "Lora" },
      },
    });
    expect(resolvePreferences(preferences, "blog").style).toMatchObject({
      headingFont: "Lora",
      layout: "Asymmetric",
      bodySize: 18,
      bodyFont: "Manrope",
    });
    preferences.style.mode = "auto";
    expect(resolvePreferences(preferences, "blog").style.layout).toBe(
      "Centered",
    );
    preferences.style.mode = "manual";
    expect(resolvePreferences(preferences, "blog").style.layout).toBe(
      "Asymmetric",
    );
    expect(
      preferencesSchema.safeParse({
        style: { values: { headingFont: "Custom" } },
      }).success,
    ).toBe(false);
    expect(
      preferencesSchema.safeParse({
        style: { values: { bodySize: 8, duration: 5000 } },
      }).success,
    ).toBe(false);
    expect(
      preferencesSchema.safeParse({
        style: { values: { customBodyFont: "<script>" } },
      }).success,
    ).toBe(false);
  });
  it("activates reviewed skills, enforces mandatory security and rejects unavailable entries", () => {
    expect(new Set(skillCatalog.map((skill) => skill.id)).size).toBe(
      skillCatalog.length,
    );
    const preferences = defaultPreferences();
    preferences.skills = { mode: "manual", selected: ["webapp-testing"] };
    expect(
      selectSkills(preferences, "landing").map((skill) => skill.id),
    ).toEqual(["buatin-security", "buatin-verification", "webapp-testing"]);
    preferences.skills.selected.push("imagegen");
    expect(skillSelectionIssues(preferences)).not.toEqual([]);
    expect(
      skillCatalog
        .filter(
          (skill) => skill.source !== "Buatin" && skill.status === "ready",
        )
        .every((skill) => Boolean(skill.checksum && skill.license)),
    ).toBe(true);
  });
  it("snapshots safe reference fields and appends authoritative settings idempotently", () => {
    const preferences = readPreferences({
      colors: {
        mode: "manual",
        palette: [
          { name: "Primary", hex: "#135" },
          { name: "Secondary", hex: "#fed" },
        ],
      },
    });
    const reference = {
      id: "ref",
      name: "brief.md",
      mime: "text/markdown",
      checksum: "hash",
      role: "requirements",
      note: "Gunakan grid editorial",
      sourceUrl: "",
      rights: "Milik sendiri",
      text: "Konten referensi.",
      status: "ready",
      storageKey: "private",
    };
    const context = projectContext(preferences, "landing", [reference]);
    expect(JSON.stringify(context)).not.toContain("storageKey");
    const result = applyCustomization("# Design\n", "design", context);
    expect(result).toContain("#113355");
    expect(result).toContain("grid editorial");
    expect(applyCustomization(result, "design", context)).toBe(result);
    expect(applyCustomization("# Old\n", "design")).toBe("# Old\n");
    expect(
      planningBrief("Tanpa login atau pembayaran.", defaultPreferences(), []),
    ).not.toContain("Better Auth");
  });
  it("matches signatures, rejects active formats and validates source URLs", () => {
    expect(detectReference("fake.png", Buffer.from("not a PNG"))).toBeNull();
    expect(detectReference("active.svg", Buffer.from("<svg/>"))).toBeNull();
    expect(detectReference("brief.MD", Buffer.from("# Hello"))?.mime).toBe(
      "text/markdown",
    );
    expect(
      referenceMetadataSchema.safeParse({ sourceUrl: "file:///etc/passwd" })
        .success,
    ).toBe(false);
    expect(
      referenceMetadataSchema.safeParse({
        sourceUrl: "https://example.com/reference",
      }).success,
    ).toBe(true);
  });
  it("chooses loading guidance per website/rendering without forcing skeletons", () => {
    const preferences = defaultPreferences();
    preferences.technology = {
      mode: "manual",
      choices: { rendering: "SSG" },
      additional: "",
    };
    const landing = projectContext(preferences, "landing");
    const content = applyCustomization(
      "# Performance\n",
      "performance",
      landing,
    );
    expect(landing.loading).toMatchObject({
      profile: "content",
      rendering: "SSG",
    });
    expect(content).toContain("jangan menambahkan skeleton pada konten statis");
    expect(content).toContain("Jangan lazy-load hero/gambar LCP");
    expect(content).toContain("width/height atau aspect-ratio");
    expect(applyCustomization(content, "performance", landing)).toBe(content);
    const dashboard = projectContext(defaultPreferences(), "internal");
    const components = applyCustomization(
      "# Components\n",
      "components",
      dashboard,
    );
    expect(dashboard.loading.profile).toBe("application");
    expect(components).toContain("pertahankan data lama saat refresh");
    expect(components).toContain("Jangan menambah waktu tunggu minimum");
    expect(components).toContain("SSR streaming tetap boleh");
    const design = applyCustomization("# Design\n", "design", dashboard);
    expect(design).toContain("aria-hidden");
    expect(design).toContain("prefers-reduced-motion");
    expect(design).toContain("jangan membuat persentase palsu");
    expect(loadingGuidance("payments", dashboard.loading)).toBeUndefined();
    for (const web of webTypes) {
      const policy = loadingPolicy(web.id);
      expect(policy.candidates.length).toBeGreaterThan(0);
      expect(loadingGuidance("testing", policy)).toContain(
        "bukan hasil perkiraan",
      );
    }
    expect(loadingPolicy("custom").profile).toBe("review");
  });
});
