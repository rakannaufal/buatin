import { z } from "zod";
import { catalog, webTypes, floor, closure, slugify } from "./catalog";
import type {
  CatalogEntry,
  PlannerOutput,
  ResolvedPlan,
  PlannedFile,
  WebType,
} from "./types";
export const plannerSchema = z.object({
  project_name: z.string().min(1).max(160),
  project_slug: z.string().max(80),
  web_type: z.enum([
    "landing",
    "company",
    "portfolio",
    "blog",
    "ecommerce",
    "saas",
    "internal",
    "booking",
    "custom",
  ]),
  summary: z.string().max(300),
  complexity: z.enum(["simple", "medium", "complex"]),
  features_detected: z
    .array(z.object({ id: z.string(), evidence: z.string().max(500) }))
    .max(100),
  files: z
    .array(
      z.object({
        id: z.string(),
        decision: z.enum(["include", "exclude"]),
        reason: z.string().max(140),
        confidence: z.number().min(0).max(1),
      }),
    )
    .max(100),
  missing_info: z
    .array(
      z.object({
        question: z.string().max(300),
        impact: z.enum(["high", "medium", "low"]),
      }),
    )
    .max(10),
  assumptions: z.array(z.string().max(500)).max(30),
  risks: z.array(z.string().max(500)).max(30),
});
const normalize = (value: string) =>
  value.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
export function hasPositiveMention(brief: string, trigger: string) {
  const input = normalize(brief);
  const escaped = normalize(trigger).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const match of input.matchAll(new RegExp(`\\b${escaped}\\b`, "g"))) {
    const prefix =
      input
        .slice(0, match.index)
        .split(/[.!?\n]|\b(?:tetapi|namun|tapi|but)\b/)
        .at(-1) ?? "";
    if (!/\b(?:tanpa|tidak|jangan|bukan|without|no)\b/.test(prefix))
      return true;
  }
  return false;
}
export function extractJson(text: string): unknown {
  let start = -1,
    depth = 0,
    quoted = false,
    escaped = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (start < 0) {
      if (char === "{") {
        start = i;
        depth = 1;
      }
      continue;
    }
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quoted && char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted) {
      if (char === "{") depth++;
      if (char === "}" && --depth === 0)
        return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error("PLANNER_INVALID_JSON");
}
export function defaultPlanner(type: WebType, brief: string): PlannerOutput {
  return {
    project_name: "Proyek baru",
    project_slug: "proyek-baru",
    web_type: type,
    summary: brief.slice(0, 300),
    complexity: "medium",
    features_detected: [],
    files: [],
    missing_info: [],
    assumptions: [
      "Pemilihan dokumen menggunakan aturan minimum dan wajib tipe.",
    ],
    risks: [],
  };
}
export function resolvePlan(
  input: PlannerOutput,
  brief: string,
  type: WebType,
  maxFiles = catalog.length,
  entries: CatalogEntry[] = catalog,
  fallback = false,
): ResolvedPlan {
  const definition = webTypes.find((t) => t.id === type);
  if (!definition) throw new Error("INVALID_WEB_TYPE");
  const map = new Map(entries.map((e) => [e.id, e]));
  const required = closure([...floor, ...definition.required], entries);
  if (required.size > maxFiles) throw new Error("MAX_FILES_BELOW_MINIMUM");
  const roots = new Map<
    string,
    { reason: string; source: PlannedFile["source"]; confidence: number }
  >();
  for (const id of floor)
    roots.set(id, {
      reason: "Dokumen minimum setiap proyek",
      source: "floor",
      confidence: 1,
    });
  for (const id of definition.required)
    roots.set(id, {
      reason: `Wajib untuk ${definition.label}`,
      source: "type",
      confidence: 1,
    });
  const evidence = new Set(
    input.features_detected
      .filter(
        (f) =>
          normalize(f.evidence).length > 2 &&
          normalize(brief).includes(normalize(f.evidence)),
      )
      .map((f) => f.id),
  );
  if (!fallback) {
    for (const item of entries) {
      const trigger = item.triggers.find((t) => hasPositiveMention(brief, t));
      if (trigger && !roots.has(item.id))
        roots.set(item.id, {
          reason: `Brief menyebut "${trigger}"`,
          source: "trigger",
          confidence: 0.8,
        });
    }
    for (const file of input.files) {
      if (
        !map.has(file.id) ||
        file.decision !== "include" ||
        !evidence.has(file.id) ||
        required.has(file.id)
      )
        continue;
      const entry = map.get(file.id)!;
      if (
        entry.triggers.length &&
        !entry.triggers.some((t) => hasPositiveMention(brief, t))
      )
        continue;
      roots.set(file.id, {
        reason: file.reason,
        source: "evidence",
        confidence: file.confidence,
      });
    }
  }
  const warnings: string[] = [];
  let selected = closure(roots.keys(), entries);
  const removable = [...roots]
    .filter(([id]) => !required.has(id))
    .sort(
      (a, b) => a[1].confidence - b[1].confidence || a[0].localeCompare(b[0]),
    );
  while (selected.size > maxFiles && removable.length) {
    roots.delete(removable.shift()![0]);
    selected = closure(roots.keys(), entries);
    if (!warnings.length)
      warnings.push(
        "Sebagian kandidat dipangkas untuk memenuhi batas dokumen.",
      );
  }
  const files = [...selected]
    .map((id) => {
      const item = map.get(id)!;
      const root = roots.get(id);
      const parent = entries
        .filter((e) => selected.has(e.id) && e.requires.includes(id))
        .map((e) => e.title)
        .join(", ");
      return {
        id,
        path: item.path,
        reason: root?.reason ?? `Dependensi dari ${parent}`,
        source: root?.source ?? "dependency",
        locked: required.has(id),
      } satisfies PlannedFile;
    })
    .sort(
      (a, b) =>
        map.get(a.id)!.order - map.get(b.id)!.order || a.id.localeCompare(b.id),
    );
  return {
    ...input,
    web_type: type,
    project_slug: slugify(input.project_slug || input.project_name),
    selected: files,
    warnings,
    fallback,
  };
}
export function editPlan(
  plan: ResolvedPlan,
  id: string,
  include: boolean,
  maxFiles = catalog.length,
  entries: CatalogEntry[] = catalog,
): ResolvedPlan {
  const map = new Map(entries.map((e) => [e.id, e]));
  if (!map.has(id)) throw new Error("UNKNOWN_FILE");
  const definition = webTypes.find((t) => t.id === plan.web_type)!;
  const locked = closure([...floor, ...definition.required], entries);
  if (!include && locked.has(id)) throw new Error("FILE_REQUIRED");
  if (
    !include &&
    plan.selected.some(
      (e) => e.id !== id && map.get(e.id)!.requires.includes(id),
    )
  )
    throw new Error("FILE_DEPENDENCY_REQUIRED");
  const roots = new Set(
    plan.selected.filter((f) => f.source !== "dependency").map((f) => f.id),
  );
  if (include) roots.add(id);
  else roots.delete(id);
  const chosen = closure(roots, entries);
  if (chosen.size > maxFiles) throw new Error("MAX_FILES_EXCEEDED");
  return {
    ...plan,
    selected: entries
      .filter((e) => chosen.has(e.id))
      .map((e) => {
        const previous = plan.selected.find((f) => f.id === e.id);
        return {
          id: e.id,
          path: e.path,
          locked: locked.has(e.id),
          source: roots.has(e.id)
            ? (previous?.source ?? "manual")
            : "dependency",
          reason:
            previous?.reason ??
            (e.id === id
              ? "Dipilih secara manual"
              : "Dependensi pilihan dokumen"),
        } satisfies PlannedFile;
      })
      .sort((a, b) => map.get(a.id)!.order - map.get(b.id)!.order),
  };
}
