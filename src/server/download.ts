import { ZipArchive } from "archiver";
import { jobFor } from "./projects";
import { getEnv } from "./config";
import { AppError } from "./errors";
import { rateLimit } from "./limits";
import { lintOutput, manifestFor } from "../domain/lint";
import type { Snapshot, LintIssue } from "../domain/types";
import { runtimeSecrets } from "../worker/generator";
export async function download(userId: string, id: string, fileId?: string) {
  await rateLimit(`download:${userId}`, 30, 60);
  const job = await jobFor(userId, id);
  if (!["succeeded", "partial", "failed"].includes(job.status))
    throw new AppError(
      "RESULT_NOT_READY",
      409,
      "Hasil belum tersedia untuk diunduh.",
    );
  const snapshot = job.snapshot as unknown as Snapshot;
  const outputs = job.files
    .filter((f) => f.status === "succeeded" && f.content)
    .map((f) => ({
      id: f.fileId,
      path: snapshot.catalog.find((c) => c.id === f.fileId)!.path,
      content: f.content!,
      finishReason: f.finishReason,
    }));
  const issues = lintOutput(outputs, runtimeSecrets());
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (fileId) {
    const file = outputs.find((f) => f.id === fileId);
    if (!file) throw new AppError("NOT_FOUND", 404);
    if (
      issues.some(
        (issue) =>
          issue.fileId === fileId &&
          issue.blocksExport &&
          issue.code !== "BROKEN_REFERENCE",
      )
    )
      throw new AppError(
        "EXPORT_BLOCKED",
        409,
        "Unduhan diblokir oleh pemeriksaan keamanan.",
      );
    return new Response(file.content, {
      headers: {
        ...headers,
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileId === "agents" ? "AGENTS" : fileId}.md"`,
      },
    });
  }
  if (issues.some((issue) => issue.blocksExport))
    throw new AppError(
      "EXPORT_BLOCKED",
      409,
      "ZIP belum aman atau memiliki rujukan putus. Periksa laporan; unduhan individual tersedia untuk file aman.",
    );
  const missing = job.files
    .filter((f) => f.status !== "succeeded")
    .map((f) => f.fileId);
  const reviews = [
    ...issues,
    ...(job.lint as unknown as LintIssue[]).filter((issue) =>
      ["FALLBACK_TEMPLATE", "MODEL_CHANGED", "MOCK_OUTPUT"].includes(
        issue.code,
      ),
    ),
  ];
  const manifest = manifestFor(
    {
      name: job.project.name,
      slug: snapshot.plan.project_slug,
      webType: snapshot.webType,
    },
    outputs,
    reviews,
    missing,
    snapshot.plan.assumptions,
    job.finishedAt?.toISOString(),
  );
  const manifestText = JSON.stringify(manifest, null, 2) + "\n";
  if (
    outputs.reduce(
      (sum, f) => sum + Buffer.byteLength(f.content),
      Buffer.byteLength(manifestText),
    ) > getEnv().MAX_ARCHIVE_BYTES
  )
    throw new AppError(
      "ARCHIVE_TOO_LARGE",
      413,
      "Paket melewati batas ukuran. Unduh file individual.",
    );
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const chunks: Buffer[] = [];
  const complete = new Promise<Buffer>((resolve, reject) => {
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));
  });
  for (const file of outputs) archive.append(file.content, { name: file.path });
  archive.append(manifestText, { name: "specs/manifest.json" });
  await archive.finalize();
  const buffer = await complete;
  return new Response(new Uint8Array(buffer), {
    headers: {
      ...headers,
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${snapshot.plan.project_slug}-buatin${missing.length ? "-partial" : ""}.zip"`,
    },
  });
}
