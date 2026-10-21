import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { z } from "zod";

const digest = (value: Buffer) =>
  createHash("sha256").update(value).digest("hex");
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const safePath = z
  .string()
  .regex(/^[a-zA-Z0-9_./-]+$/)
  .refine(
    (value) => !value.startsWith("/") && !value.split("/").includes(".."),
  );
const entries = z
  .array(
    z.object({
      id: z.string().regex(/^[a-z0-9-]+$/),
      checksum: hash,
      sourceChecksum: hash,
      guidance: z.string().max(8000),
      license: z.enum(["MIT", "Apache-2.0"]),
      upstream: z
        .object({
          repository: z.string().regex(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/),
          commit: z.string().regex(/^[a-f0-9]{40}$/),
          skillPath: safePath,
          licensePath: safePath,
          sourceChecksum: hash,
          licenseChecksum: hash,
        })
        .optional(),
    }),
  )
  .parse(JSON.parse(await readFile("config/imported-skills.json", "utf8")));

async function download(
  repository: string,
  commit: string,
  file: string,
  checksum: string,
) {
  const response = await fetch(
    `https://raw.githubusercontent.com/${repository}/${commit}/${file}`,
    { redirect: "error", signal: AbortSignal.timeout(20000) },
  );
  if (!response.ok || !response.body)
    throw new Error(`GitHub returned ${response.status}`);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > 262144) throw new Error("Skill source exceeds 256 KiB");
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks);
  if (digest(data) !== checksum)
    throw new Error("Upstream checksum differs from reviewed content");
  return data;
}

// Only reviewed, pinned entries can be re-fetched; this command never runs upstream scripts.
for (const entry of entries) {
  const directory = path.join("skill-packs", entry.id);
  if (process.argv.includes("--fetch") && entry.upstream) {
    const upstream = entry.upstream;
    const raw = await download(
      upstream.repository,
      upstream.commit,
      upstream.skillPath,
      upstream.sourceChecksum,
    );
    const license = await download(
      upstream.repository,
      upstream.commit,
      upstream.licensePath,
      upstream.licenseChecksum,
    );
    await writeFile(path.join(directory, "SKILL.upstream.md"), raw);
    await writeFile(path.join(directory, "LICENSE.txt"), license);
  }
  const raw = await readFile(path.join(directory, "SKILL.upstream.md"));
  const license = await readFile(path.join(directory, "LICENSE.txt"));
  const adaptation = await readFile(path.join(directory, "ADAPTATION.md"));
  const checksum = createHash("sha256")
    .update(raw)
    .update(license)
    .update(adaptation)
    .update(entry.guidance)
    .digest("hex");
  if (digest(raw) !== entry.sourceChecksum || checksum !== entry.checksum)
    throw new Error(`Review required: ${entry.id} integrity mismatch`);
  if (
    !license
      .toString("utf8")
      .includes(
        entry.license === "MIT"
          ? "Permission is hereby granted"
          : "Apache License",
      )
  )
    throw new Error(`License mismatch: ${entry.id}`);
}
console.log(
  `Verified ${entries.length} reviewed skill packs; no upstream code executed.`,
);
