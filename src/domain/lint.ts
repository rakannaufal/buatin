import path from "node:path";
import type { LintIssue } from "./types";
import { catalog } from "./catalog";
import { traceability } from "./traceability";
export interface OutputFile {
  id: string;
  path: string;
  content: string;
  finishReason?: string | null;
}
export function hasSecret(content: string, secrets: string[] = []) {
  return (
    /\b(?:sk-[A-Za-z0-9_-]{24,}|ghp_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16})\b/.test(
      content,
    ) ||
    /\b[a-f0-9]{32}:[a-f0-9]{128}\b/i.test(content) ||
    /\$(?:2[aby]\$\d{2}\$[./A-Za-z0-9]{53}|argon2(?:id|i|d)\$[^\s"']+)/.test(
      content,
    ) ||
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(content) ||
    /(?:postgres(?:ql)?|mysql):\/\/[^\s:@/]+:([^\s@/]+)@(?!localhost[:/]|127\.0\.0\.1[:/]|\[::1\])[^\s/]+/i.test(
      content,
    ) ||
    secrets.some((key) => key.length >= 12 && content.includes(key))
  );
}
export function safePath(value: string) {
  return (
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.split("/").includes("..") &&
    /^(?:AGENTS\.md|specs\/[a-z-]+\.(?:md|json))$/.test(value)
  );
}
export function lintOutput(
  files: OutputFile[],
  secrets: string[] = [],
): LintIssue[] {
  const issues: LintIssue[] = [];
  const paths = new Set(files.map((f) => f.path));
  paths.add("specs/manifest.json");
  for (const file of files) {
    const add = (code: string, message: string, blocksExport = false) =>
      issues.push({
        code,
        message,
        fileId: file.id,
        severity: blocksExport ? "error" : "warning",
        blocksExport,
      });
    if (!safePath(file.path))
      add("UNSAFE_PATH", "Path dokumen tidak diizinkan.", true);
    if (!file.content.trim() || !/^# .+/m.test(file.content.slice(0, 300)))
      add("INVALID_MARKDOWN", "Dokumen perlu diawali judul Markdown.");
    if (/^(?:Berikut adalah|Sebagai AI|```markdown)/i.test(file.content.trim()))
      add(
        "META_WRAPPER",
        "Terdapat pembuka atau pembungkus yang bukan isi dokumen.",
      );
    if (hasSecret(file.content, secrets))
      add(
        "SECRET_DETECTED",
        "Konten menyerupai secret. Unduhan diblokir.",
        true,
      );
    if (file.finishReason === "length")
      add("TRUNCATED", "Dokumen berpotensi terpotong.");
    const stripped = file.content
      .replace(/```[^\n]*\n[\s\S]*?```/g, "")
      .replace(/`[^`]*`/g, "");
    for (const match of stripped.matchAll(
      /\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g,
    )) {
      const target = match[1].split("#")[0];
      if (!target || /^(?:https?:|mailto:|tel:)/i.test(target)) continue;
      if (/^(?:javascript:|data:)/i.test(target)) {
        add("UNSAFE_LINK", "Tautan memiliki skema berbahaya.", true);
        continue;
      }
      let decoded: string;
      try {
        decoded = decodeURIComponent(target);
      } catch {
        add("BROKEN_REFERENCE", "Tautan internal tidak valid.", true);
        continue;
      }
      const resolved = path.posix.normalize(
        path.posix.join(path.posix.dirname(file.path), decoded),
      );
      if (!paths.has(resolved))
        add("BROKEN_REFERENCE", `Rujukan tidak tersedia: ${target}`, true);
    }
    const count = (file.content.match(/\[(?:ISI|PLACEHOLDER)\]/g) ?? []).length;
    if (count) add("PLACEHOLDERS", `${count} bagian masih perlu diisi.`);
  }
  const trace = traceability(files);
  for (const row of trace.rows) {
    if (!row.ac.length || !row.test.length || !row.task.length)
      issues.push({
        code: "TRACEABILITY_GAP",
        message: `Pemetaan ${row.req} ke acceptance, testing, atau task belum lengkap.`,
        severity: "warning",
        blocksExport: false,
      });
  }
  for (const ac of trace.untested)
    issues.push({
      code: "UNTESTED_ACCEPTANCE",
      message: `${ac} belum dirujuk oleh test.`,
      severity: "warning",
      blocksExport: false,
    });
  for (const ref of trace.undefinedIds)
    issues.push({
      code: "UNDEFINED_ID",
      fileId: ref.fileId,
      message: `${ref.id} tidak ditemukan dalam dokumen sumbernya.`,
      severity: "warning",
      blocksExport: false,
    });
  return issues;
}
export function manifestFor(
  project: { name: string; slug: string; webType: string },
  files: OutputFile[],
  issues: LintIssue[],
  missing: string[],
  assumptions: string[],
  updatedAt = new Date().toISOString(),
) {
  return {
    specVersion: "1.0",
    project,
    readiness:
      issues.length || missing.length ? "needs-review" : "ready-for-review",
    updatedAt,
    files: [
      ...files.map((f) => ({
        path: f.path,
        kind: catalog.find((entry) => entry.id === f.id)?.kind ?? "document",
      })),
      { path: "specs/manifest.json", kind: "manifest" },
    ],
    assumptions,
    blockers: missing,
    reviews: issues,
    traceability: traceability(files).rows,
  };
}
