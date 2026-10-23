import path from "node:path";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { AppError } from "./errors";
import { db, type Transaction } from "./db";
import { getEnv } from "./config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export async function scannerExecutableAvailable() {
  const file = getEnv().REFERENCE_SCANNER_PATH;
  if (!path.isAbsolute(file)) return false;
  try {
    await access(file, constants.X_OK);
    const probe = getEnv().REFERENCE_SCANNER_HEALTH_PATH;
    if (probe) {
      if (!path.isAbsolute(probe)) return false;
      await promisify(execFile)(probe, ["--health"], {
        timeout: 3000,
        maxBuffer: 1024,
        env: {
          NODE_ENV: "production",
          PATH: process.env.PATH || "/usr/bin:/bin",
          CLAMAV_DATABASE_DIR:
            process.env.CLAMAV_DATABASE_DIR || "/var/lib/clamav",
        },
      });
    }
    return true;
  } catch {
    return false;
  }
}

export async function workerScannerReady() {
  if (getEnv().PROCESSING_MODE === "request") return false;
  const heartbeat = await db.setting.findUnique({ where: { key: "worker" } });
  const age = heartbeat ? Date.now() - heartbeat.updatedAt.getTime() : Infinity;
  const value = heartbeat?.value;
  return Boolean(
    age >= 0 &&
    age < 30000 &&
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    value.scanner === true,
  );
}

export async function requireWorkerReady(tx: Transaction = db) {
  // Request processing uses this transaction's database; no persistent worker is required.
  if (getEnv().PROCESSING_MODE === "request") return;
  const worker = await tx.setting.findUnique({
    where: { key: "worker" },
    select: { updatedAt: true },
  });
  const age = worker ? Date.now() - worker.updatedAt.getTime() : Infinity;
  if (age < 0 || age >= 30000)
    throw new AppError(
      "WORKER_UNAVAILABLE",
      503,
      "Pemrosesan sementara tidak tersedia. Kuota belum dipakai; coba kembali nanti.",
    );
}
