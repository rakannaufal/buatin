import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { catalog } from "../src/domain/catalog";
import expected from "../config/template-checksums.json";
const actual: Record<string, string> = {};
for (const entry of catalog) {
  const text = await readFile(`templates/${entry.path}`, "utf8");
  if (
    !text.startsWith("# ") ||
    text.length < 500 ||
    Buffer.byteLength(text) > 65536 ||
    /\[(?:ISI|PLACEHOLDER)\]/.test(text) ||
    (text.match(/^## /gm) ?? []).length < 3
  )
    throw new Error(`Incomplete template: ${entry.path}`);
  actual[entry.path] = createHash("sha256").update(text).digest("hex");
}
if (
  catalog.length !== 43 ||
  new Set(catalog.map((entry) => entry.path)).size !== 43
)
  throw new Error("Invalid document catalog");
if (process.argv.includes("--update"))
  await writeFile(
    "config/template-checksums.json",
    JSON.stringify(actual, null, 2) + "\n",
  );
else if (JSON.stringify(actual) !== JSON.stringify(expected))
  throw new Error(
    "Template checksums changed; review before updating checksums.",
  );
console.log("43 structured document templates verified.");
