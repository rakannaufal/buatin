import { describe, expect, it } from "vitest";
import {
  resolveVariables,
  type TemplateVariables,
} from "../../src/domain/template-variables";
import { catalog, webTypes } from "../../src/domain/catalog";
import {
  readPreferences,
  resolvePreferences,
  recommendStyle,
} from "../../src/domain/preferences";
import { selectSkills } from "../../src/domain/skills";
import type { ResolvedPlan, WebType } from "../../src/domain/types";

function makePlan(overrides: Partial<ResolvedPlan> = {}): ResolvedPlan {
  return {
    project_name: "Toko Kopi",
    project_slug: "toko-kopi",
    web_type: "ecommerce",
    summary: "Toko kopi online sederhana.",
    complexity: "medium",
    features_detected: [
      { id: "auth", evidence: "login" },
      { id: "payments", evidence: "bayar" },
    ],
    files: [],
    missing_info: [{ question: "Metode pembayaran?", impact: "high" }],
    assumptions: ["Pakai Rupiah"],
    risks: ["Integrasi payment gateway"],
    selected: [
      {
        id: "agents",
        path: "docs/agents.md",
        reason: "floor",
        source: "floor",
        locked: true,
      },
      {
        id: "auth",
        path: "docs/auth.md",
        reason: "fitur login",
        source: "evidence",
        locked: false,
      },
      {
        id: "payments",
        path: "docs/payments.md",
        reason: "fitur bayar",
        source: "evidence",
        locked: false,
      },
      {
        id: "seo",
        path: "docs/seo.md",
        reason: "ecommerce needs seo",
        source: "type",
        locked: false,
      },
    ],
    warnings: [],
    fallback: false,
    ...overrides,
  };
}

function makeInput(
  overrides: {
    webType?: WebType;
    plan?: Partial<ResolvedPlan>;
    preferencesRaw?: unknown;
    references?: Array<{
      id: string;
      name: string;
      mime: string;
      checksum: string;
      role: string;
      note: string;
      sourceUrl: string;
      rights: string;
      text: string;
      status: string;
    }>;
  } = {},
) {
  const webType = overrides.webType ?? "ecommerce";
  const plan = makePlan(overrides.plan);
  const prefs = readPreferences(overrides.preferencesRaw ?? undefined);
  const preferences = resolvePreferences(prefs, webType);
  const skills = selectSkills(prefs, webType);
  const references = overrides.references ?? [];
  return {
    projectName: plan.project_name,
    projectSlug: plan.project_slug,
    brief: "Buat toko kopi online",
    webType,
    plan,
    preferences,
    skills,
    references,
    catalog,
  };
}

describe("resolveVariables", () => {
  it("returns correct projectName, slug, brief", () => {
    const result = resolveVariables(makeInput());
    expect(result.projectName).toBe("Toko Kopi");
    expect(result.projectSlug).toBe("toko-kopi");
    expect(result.brief).toBe("Buat toko kopi online");
  });

  it("resolves web type label and description from webTypes", () => {
    const result = resolveVariables(makeInput({ webType: "landing" }));
    const entry = webTypes.find((t) => t.id === "landing")!;
    expect(result.webType).toBe("landing");
    expect(result.webTypeLabel).toBe(entry.label);
    expect(result.webTypeDescription).toBe(entry.description);
  });

  it("maps all 9 web type booleans correctly", () => {
    for (const wt of webTypes) {
      const result = resolveVariables(makeInput({ webType: wt.id }));
      expect(
        result[
          `is${wt.id.charAt(0).toUpperCase()}${wt.id.slice(1)}` as keyof TemplateVariables
        ],
      ).toBe(true);
    }
  });

  it("sets feature booleans from selected file IDs", () => {
    const result = resolveVariables(makeInput());
    expect(result.hasAuth).toBe(true);
    expect(result.hasPayments).toBe(true);
    expect(result.hasSeo).toBe(true);
    // Not selected
    expect(result.hasSearch).toBe(false);
    expect(result.hasAdmin).toBe(false);
    expect(result.hasCms).toBe(false);
    expect(result.hasI18n).toBe(false);
    expect(result.hasRealtime).toBe(false);
  });

  it("maps selectedFiles with id, path, reason, locked", () => {
    const result = resolveVariables(makeInput());
    expect(result.selectedFiles).toHaveLength(4);
    const authFile = result.selectedFiles.find((f) => f.id === "auth");
    expect(authFile).toEqual({
      id: "auth",
      path: "docs/auth.md",
      reason: "fitur login",
      locked: false,
    });
  });

  it("maps assumptions, risks, missingInfo", () => {
    const result = resolveVariables(makeInput());
    expect(result.assumptions).toEqual(["Pakai Rupiah"]);
    expect(result.risks).toEqual(["Integrasi payment gateway"]);
    expect(result.missingInfo).toEqual([
      { question: "Metode pembayaran?", impact: "high" },
    ]);
  });

  it("provides technology as flat Record<string,string>", () => {
    const result = resolveVariables(makeInput());
    expect(typeof result.technology).toBe("object");
    expect(typeof result.technology.frontend).toBe("string");
    expect(typeof result.technology.language).toBe("string");
  });

  it("provides palette with primary and secondary color shortcuts", () => {
    const result = resolveVariables(makeInput());
    expect(result.palette.length).toBeGreaterThanOrEqual(2);
    expect(result.primaryColor).toBe(result.palette[0].hex);
    expect(result.secondaryColor).toBe(result.palette[1].hex);
  });

  it("provides typography shortcuts from style", () => {
    const result = resolveVariables(makeInput());
    const rec = recommendStyle("ecommerce");
    expect(result.headingFont).toBe(rec.headingFont);
    expect(result.bodyFont).toBe(rec.bodyFont);
    expect(result.monoFont).toBe(rec.monoFont);
    expect(result.containerWidth).toBe(rec.containerWidth);
    expect(result.spacing).toBe(rec.spacing);
  });

  it("honors manual preferences for style and technology", () => {
    const result = resolveVariables(
      makeInput({
        preferencesRaw: {
          style: {
            mode: "manual",
            values: {
              headingFont: "Lora",
              containerWidth: 960,
            },
          },
        },
      }),
    );
    expect(result.styleMode).toBe("manual");
    expect(result.headingFont).toBe("Lora");
    expect(result.containerWidth).toBe(960);
    expect(result.lockedStyle).toContain("headingFont");
    expect(result.lockedStyle).toContain("containerWidth");
  });

  it("includes skills with correct shape", () => {
    const result = resolveVariables(makeInput());
    expect(result.skills.length).toBeGreaterThan(0);
    for (const skill of result.skills) {
      expect(skill).toHaveProperty("id");
      expect(skill).toHaveProperty("name");
      expect(skill).toHaveProperty("source");
      expect(skill).toHaveProperty("version");
      expect(skill).toHaveProperty("license");
      expect(skill).toHaveProperty("documents");
      expect(skill).toHaveProperty("checksum");
    }
  });

  it("handles references and sets hasReferences", () => {
    const refs = [
      {
        id: "ref-1",
        name: "Competitor",
        mime: "text/html",
        checksum: "abc123",
        role: "inspiration",
        note: "Lihat layoutnya",
        sourceUrl: "https://example.com",
        rights: "fair-use",
        text: "Halaman utama competitor",
        status: "ready",
      },
    ];
    const result = resolveVariables(makeInput({ references: refs }));
    expect(result.hasReferences).toBe(true);
    expect(result.references).toHaveLength(1);
    expect(result.references[0].id).toBe("ref-1");
    expect(result.references[0].name).toBe("Competitor");
    expect(result.references[0].mime).toBe("text/html");
  });

  it("hasReferences is false when no references", () => {
    const result = resolveVariables(makeInput({ references: [] }));
    expect(result.hasReferences).toBe(false);
    expect(result.references).toHaveLength(0);
  });

  it("includes full catalog entries", () => {
    const result = resolveVariables(makeInput());
    expect(result.catalog).toHaveLength(catalog.length);
    for (const entry of result.catalog) {
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("path");
      expect(entry).toHaveProperty("title");
      expect(entry).toHaveProperty("purpose");
    }
  });

  it("provides language and renderingStrategy", () => {
    const result = resolveVariables(makeInput());
    expect(typeof result.language).toBe("string");
    expect(typeof result.renderingStrategy).toBe("string");
  });

  it("provides complexity and summary from plan", () => {
    const result = resolveVariables(makeInput());
    expect(result.complexity).toBe("medium");
    expect(result.summary).toBe("Toko kopi online sederhana.");
  });

  it("technologyMode and colorMode from preference modes", () => {
    const result = resolveVariables(makeInput());
    expect(result.technologyMode).toBe("auto");
    expect(result.colorMode).toBe("auto");
  });

  it("manual color palette is used when mode is manual", () => {
    const customPalette = [
      { name: "Brand", hex: "#FF0000" },
      { name: "Accent", hex: "#00FF00" },
    ];
    const result = resolveVariables(
      makeInput({
        preferencesRaw: {
          colors: { mode: "manual", palette: customPalette },
        },
      }),
    );
    expect(result.colorMode).toBe("manual");
    expect(result.primaryColor).toBe("#FF0000");
    expect(result.secondaryColor).toBe("#00FF00");
  });
});
