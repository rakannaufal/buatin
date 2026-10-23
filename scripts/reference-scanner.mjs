#!/usr/bin/env node
import process from "node:process";
import console from "node:console";
import { stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

try {
  const directory = process.env.CLAMAV_DATABASE_DIR || "/var/lib/clamav";
  const candidates = await Promise.all(
    ["daily.cvd", "daily.cld"].map(async (name) => {
      try {
        return await stat(path.join(directory, name));
      } catch {
        return null;
      }
    }),
  );
  const fresh = candidates.some(
    (info) =>
      info?.isFile() &&
      info.size > 0 &&
      Date.now() - info.mtimeMs >= 0 &&
      Date.now() - info.mtimeMs < 48 * 3600000,
  );
  if (!fresh) throw new Error("SIGNATURES_UNAVAILABLE");
  const health = process.argv[2] === "--health" && process.argv.length === 3;
  const file = process.argv[3];
  if (
    !health &&
    (process.argv[2] !== "--no-summary" ||
      process.argv.length !== 4 ||
      !path.isAbsolute(file) ||
      !(await stat(file)).isFile())
  )
    throw new Error("INVALID_SCAN_REQUEST");
  const result = spawnSync(
    "/usr/bin/clamscan",
    health
      ? ["--version"]
      : ["--no-summary", `--database=${directory}`, "--", file],
    {
      env: { PATH: "/usr/bin:/bin", TMPDIR: process.env.TMPDIR || "/tmp" },
      stdio: "ignore",
      timeout: 18000,
    },
  );
  process.exitCode =
    result.status === 0 ? 0 : result.status === 1 && !health ? 1 : 2;
} catch {
  console.error("Scanner unavailable, signatures stale, or invalid input.");
  process.exitCode = 2;
}
