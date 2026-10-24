import catalogJson from "../../config/file-catalog.json";
import typesJson from "../../config/web-types.json";
import type { CatalogEntry, WebTypeEntry } from "./types";
export const catalog = catalogJson as CatalogEntry[];
export const webTypes = typesJson as WebTypeEntry[];
export const floor = [
  "skills",
  "agents",
  "index",
  "brief",
  "prd",
  "architecture",
  "security",
  "testing",
  "acceptance",
  "implementation-plan",
  "decisions",
  "progress",
];
export const byId = new Map(catalog.map((file) => [file.id, file]));
export function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40)
      .replace(/-$/g, "") || "proyek"
  );
}
export function closure(
  ids: Iterable<string>,
  entries: CatalogEntry[] = catalog,
) {
  const map = new Map(entries.map((e) => [e.id, e]));
  const result = new Set<string>();
  const active = new Set<string>();
  function add(id: string) {
    if (active.has(id)) throw new Error("CATALOG_CYCLE");
    if (result.has(id)) return;
    const item = map.get(id);
    if (!item) throw new Error("CATALOG_UNKNOWN_ID");
    active.add(id);
    for (const dependency of item.requires) add(dependency);
    active.delete(id);
    result.add(id);
  }
  for (const id of ids) add(id);
  return result;
}
