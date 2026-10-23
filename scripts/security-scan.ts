import { execFileSync } from "node:child_process";
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { hasSecret } from "../src/domain/lint";

const ignored = new Set([
  ".git",
  ".agents",
  ".codex",
  ".aws",
  "node_modules",
  ".next",
  ".next-production",
  ".local",
  ".cache",
  "dist",
  "coverage",
  "test-results",
  "playwright-report",
]);
const runtimeKeys = [
  "DATABASE_URL",
  "DATABASE_DIRECT_URL",
  "DATABASE_WORKER_URL",
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "NINEROUTER_API_KEY",
  "DUITKU_API_KEY",
  "RESEND_API_KEY",
  "TURNSTILE_SECRET_KEY",
  "REFERENCE_S3_ACCESS_KEY",
  "REFERENCE_S3_SECRET_KEY",
  "BACKUP_S3_ACCESS_KEY",
  "BACKUP_S3_SECRET_KEY",
  "VERCEL_TOKEN",
  "RENDER_API_KEY",
  "GH_TOKEN",
];
const secrets = runtimeKeys
  .map((key) => {
    const value = process.env[key];
    if (key.startsWith("DATABASE_") && value) {
      try {
        const url = new URL(value);
        // This single published credential belongs only to disposable CI databases.
        if (
          ["postgres:", "postgresql:"].includes(url.protocol) &&
          ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
          decodeURIComponent(url.password) === "ci-fixture-only"
        )
          return undefined;
      } catch {
        /* Invalid values still participate in exact secret matching. */
      }
    }
    return value;
  })
  .filter((value): value is string =>
    Boolean(
      value &&
      value.length >= 12 &&
      !/^(?:ci-only-|mock-fixture-|test-only-)/.test(value),
    ),
  );
const findings: string[] = [];
let inspected = 0;
async function scan(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      ignored.has(entry.name) ||
      (entry.name.startsWith(".env") && entry.name !== ".env.example")
    )
      continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(file);
      continue;
    }
    if (
      !entry.isFile() ||
      (!/\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|sql|txt|example|sh|Dockerfile)$/.test(
        entry.name,
      ) &&
        entry.name !== "Dockerfile") ||
      entry.name === "package-lock.json"
    )
      continue;
    const content = await readFile(file, "utf8");
    inspected++;
    content.split("\n").forEach((line, index) => {
      if (
        hasSecret(line, secrets) ||
        /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line)
      )
        findings.push(`${file}:${index + 1}: potential secret`);
    });
  }
}
const tracked = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
}).split("\0");
for (const file of tracked)
  if (/(?:^|\/)\.env(?:\.|$)/.test(file) && !file.endsWith(".env.example"))
    findings.push(`${file}: tracked environment file`);
await scan(".");
if (findings.length) {
  console.error(findings.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Secret scan passed: ${inspected} source/config/document files. Secret values are never printed.`,
  );
