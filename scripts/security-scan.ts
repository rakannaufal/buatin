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
  "BETTER_AUTH_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "NINEROUTER_API_KEY",
  "DUITKU_API_KEY",
  "RESEND_API_KEY",
  "TURNSTILE_SECRET_KEY",
  "REFERENCE_S3_ACCESS_KEY",
  "REFERENCE_S3_SECRET_KEY",
];
const secrets = runtimeKeys
  .map((key) => process.env[key])
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
      !/\.(?:[cm]?[jt]sx?|json|md|ya?ml|toml|sql|txt|example)$/.test(
        entry.name,
      ) ||
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
await scan(".");
if (findings.length) {
  console.error(findings.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `Secret scan passed: ${inspected} source/config/document files. Secret values are never printed.`,
  );
