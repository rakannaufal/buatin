import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  catalog,
  webTypes,
  floor,
  closure,
  slugify,
} from "../../src/domain/catalog";
import {
  defaultPlanner,
  resolvePlan,
  editPlan,
  extractJson,
  hasPositiveMention,
  plannerSchema,
} from "../../src/domain/planner";
import { lintOutput, manifestFor, safePath } from "../../src/domain/lint";
import { traceability } from "../../src/domain/traceability";
import { dayKey } from "../../src/server/config";
import { retryAfter } from "../../src/server/llm";

describe("catalog and plans", () => {
  it("contains exactly 42 unique, safe documents, nine types, and an acyclic graph", () => {
    expect(catalog).toHaveLength(42);
    expect(webTypes).toHaveLength(9);
    expect(new Set(catalog.map((f) => f.path)).size).toBe(42);
    expect(catalog.every((f) => safePath(f.path))).toBe(true);
    expect(closure(catalog.map((f) => f.id)).size).toBe(42);
    expect(() =>
      closure(
        ["agents"],
        [{ ...catalog[0], id: "agents", requires: ["agents"] }],
      ),
    ).toThrow("CATALOG_CYCLE");
  });
  for (const type of webTypes)
    it(`resolves ${type.id} deterministically with complete dependencies`, () => {
      const brief = readFileSync(
        `tests/fixtures/briefs/${type.id}.txt`,
        "utf8",
      );
      const input = defaultPlanner(type.id, brief),
        plan = resolvePlan(input, brief, type.id);
      expect(plan).toEqual(resolvePlan(input, brief, type.id));
      expect(
        [...closure([...floor, ...type.required])].every((id) =>
          plan.selected.some((f) => f.id === id),
        ),
      ).toBe(true);
      expect(closure(plan.selected.map((f) => f.id)).size).toBe(
        plan.selected.length,
      );
      expect(plan.selected.length).toBeLessThanOrEqual(42);
    });
  it("honors negation, rejects hallucinated evidence, preserves required files", () => {
    expect(
      hasPositiveMention(
        "Tanpa login dan pembayaran. Namun upload diperlukan.",
        "login",
      ),
    ).toBe(false);
    expect(
      hasPositiveMention(
        "Tanpa login dan pembayaran. Namun upload diperlukan.",
        "upload",
      ),
    ).toBe(true);
    const input = defaultPlanner(
      "landing",
      "Website jasa desain tanpa login dan pembayaran.",
    );
    input.files = [
      {
        id: "multitenancy",
        decision: "include",
        reason: "invented",
        confidence: 1,
      },
    ];
    input.features_detected = [
      { id: "multitenancy", evidence: "invented evidence" },
    ];
    const plan = resolvePlan(
      input,
      "Website jasa desain tanpa login dan pembayaran.",
      "landing",
    );
    expect(
      plan.selected.some((f) =>
        ["auth", "payments", "multitenancy"].includes(f.id),
      ),
    ).toBe(false);
    expect(() => editPlan(plan, "prd", false)).toThrow("FILE_REQUIRED");
    const expanded = editPlan(plan, "payments", true);
    expect(
      [...closure(["payments"])].every((id) =>
        expanded.selected.some((f) => f.id === id),
      ),
    ).toBe(true);
    expect(() => editPlan(expanded, "api", false)).toThrow();
    let full = plan;
    for (const file of catalog) full = editPlan(full, file.id, true);
    expect(full.selected).toHaveLength(42);
    expect(() => resolvePlan(input, "brief", "landing", 11)).toThrow(
      "MAX_FILES_BELOW_MINIMUM",
    );
  });
  it("parses balanced JSON with quoted braces; rejects malformed contracts", () => {
    expect(
      extractJson('prefix {"message":"a } { brace","nested":{"x":1}} suffix'),
    ).toEqual({ message: "a } { brace", nested: { x: 1 } });
    expect(() => extractJson("{bad")).toThrow();
    expect(plannerSchema.safeParse({}).success).toBe(false);
    expect(slugify("../../ Café $() Project")).toBe("cafe-project");
    expect(slugify("中文")).toBe("proyek");
  });
});

describe("output integrity", () => {
  const docs = [
    { id: "prd", path: "specs/prd.md", content: "# PRD\nREQ-27: Booking." },
    {
      id: "acceptance",
      path: "specs/acceptance.md",
      content:
        "# Acceptance\nAC-42: REQ-27 confirmed.\nAC-43: REQ-27 rejected.",
    },
    {
      id: "testing",
      path: "specs/testing.md",
      content: "# Tests\nTEST-81: AC-42 happy path.",
    },
    {
      id: "implementation-plan",
      path: "specs/implementation-plan.md",
      content: "# Tasks\nT-2.03: Implement REQ-27 and run TEST-81.",
    },
  ];
  it("extracts real trace IDs and reports untested acceptance", () => {
    const result = traceability(docs);
    expect(result.rows).toEqual([
      {
        req: "REQ-27",
        ac: ["AC-42", "AC-43"],
        test: ["TEST-81"],
        task: ["T-2.03"],
      },
    ]);
    expect(result.untested).toEqual(["AC-43"]);
    expect(lintOutput(docs).some((i) => i.code === "UNTESTED_ACCEPTANCE")).toBe(
      true,
    );
    expect(
      manifestFor(
        { name: "P", slug: "p", webType: "landing" },
        docs,
        [],
        [],
        [],
      ).traceability,
    ).toEqual(result.rows);
  });
  it("blocks secrets, unsafe paths, and missing references, accepts valid relative links", () => {
    expect(
      lintOutput([
        {
          id: "bad",
          path: "../../evil.md",
          content:
            "# Test\n[bad](javascript:alert)\n[missing](missing.md)\nsk-" +
            "x".repeat(30),
        },
      ])
        .filter((i) => i.blocksExport)
        .map((i) => i.code),
    ).toEqual(
      expect.arrayContaining([
        "UNSAFE_PATH",
        "SECRET_DETECTED",
        "UNSAFE_LINK",
        "BROKEN_REFERENCE",
      ]),
    );
    expect(
      lintOutput([
        {
          id: "agents",
          path: "AGENTS.md",
          content: "# Agent\n[PRD](specs/prd.md)",
        },
        ...docs,
      ]).some((i) => i.code === "BROKEN_REFERENCE"),
    ).toBe(false);
    expect(
      lintOutput([
        {
          id: "prd",
          path: "specs/prd.md",
          content: "# Title\n[ISI]",
          finishReason: "length",
        },
      ]).map((i) => i.code),
    ).toEqual(expect.arrayContaining(["PLACEHOLDERS", "TRUNCATED"]));
  });
  it("makes incomplete manifests explicit and enumerates exactly the exported files", () => {
    const manifest = manifestFor(
      { name: "P", slug: "p", webType: "landing" },
      docs,
      [],
      ["agents"],
      [],
    );
    expect(manifest.readiness).toBe("needs-review");
    expect(manifest.blockers).toEqual(["agents"]);
    expect(manifest.files.map((f) => f.path)).toEqual([
      ...docs.map((f) => f.path),
      "specs/manifest.json",
    ]);
  });
  it("calculates Jakarta midnight and Retry-After in seconds or HTTP date", () => {
    expect(dayKey(new Date("2026-10-19T17:01:00Z"), "Asia/Jakarta")).toBe(
      "2026-10-20",
    );
    expect(retryAfter("2", 0)).toBe(2000);
    expect(retryAfter("Thu, 01 Jan 1970 00:00:03 GMT", 0)).toBe(3000);
    expect(retryAfter("invalid")).toBe(0);
  });
});
