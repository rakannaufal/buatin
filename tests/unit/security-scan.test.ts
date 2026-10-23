import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { randomBytes, randomUUID } from "node:crypto";

function scan(databaseUrl: string, overrides: Record<string, string> = {}) {
  return spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/security-scan.ts"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        DATABASE_DIRECT_URL: "",
        DATABASE_WORKER_URL: "",
        ...overrides,
      },
    },
  );
}

it("accepts the published disposable CI database credential", () => {
  const result = scan(
    "postgresql://speckit:ci-fixture-only@127.0.0.1:5432/speckit",
  );
  expect(result.status, result.stderr).toBe(0);
});

it("detects deployment secrets in shell scripts and Dockerfiles without disclosure", async () => {
  const secret = randomBytes(24).toString("hex");
  for (const extension of ["sh", "Dockerfile"]) {
    const file = `.scanner-fixture-${randomUUID()}.${extension}`;
    await writeFile(file, `SENSITIVE_VALUE=${secret}\n`, {
      flag: "wx",
      mode: 0o600,
    });
    try {
      const result = scan("postgresql://fixture@127.0.0.1:5432/app", {
        VERCEL_TOKEN: secret,
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`${file}:1: potential secret`);
      expect(result.stderr).not.toContain(secret);
    } finally {
      await unlink(file);
    }
  }
});

it("still detects other local database credentials without printing their values", async () => {
  const password = randomBytes(24).toString("hex");
  const url = `postgresql://fixture:${password}@127.0.0.1:5432/app`;
  const file = `.scanner-fixture-${randomUUID()}.txt`;
  await writeFile(file, url, { flag: "wx", mode: 0o600 });
  try {
    const result = scan(url);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${file}:1: potential secret`);
    expect(result.stderr).not.toContain(password);
    expect(result.stderr).not.toContain(url);
  } finally {
    await unlink(file);
  }
});
