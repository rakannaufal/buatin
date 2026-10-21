import path from "node:path";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import checksums from "../../config/template-checksums.json";
import { getEnv } from "./config";
import { AppError } from "./errors";
import { db } from "./db";
export async function readTemplate(
  entry: { path: string; title: string },
  usePublished = true,
) {
  const published = usePublished
    ? await db.contentVersion.findFirst({
        where: { kind: "template", key: entry.path, status: "published" },
      })
    : null;
  if (published) {
    if (
      createHash("sha256").update(published.content).digest("hex") !==
      published.checksum
    )
      throw new AppError("TEMPLATE_UNAVAILABLE", 503);
    return published.content;
  }
  const env = getEnv();
  try {
    const content = await readFile(
      path.resolve(env.TEMPLATES_DIR, entry.path),
      "utf8",
    );
    if (
      !/^# .+/m.test(content.slice(0, 200)) ||
      Buffer.byteLength(content) > 32000
    )
      throw new Error("Invalid template");
    if (
      env.TEMPLATE_SOURCE === "builtin" &&
      createHash("sha256").update(content).digest("hex") !==
        (checksums as Record<string, string>)[entry.path]
    )
      throw new Error("Unreviewed builtin template");
    return content;
  } catch {
    if (env.TEMPLATE_SOURCE !== "fallback")
      throw new AppError(
        "TEMPLATE_UNAVAILABLE",
        503,
        "Template belum siap. Hubungi pengelola untuk memeriksa berkas dan checksum.",
      );
    return `# ${entry.title}\n\n## Kebutuhan yang belum ditentukan\n\n[ISI]\n`;
  }
}
