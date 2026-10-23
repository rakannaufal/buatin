import path from "node:path";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { AppError } from "./errors";
import { db, type Transaction } from "./db";
import { getEnv } from "./config";

export async function scannerExecutableAvailable() {
  const file = getEnv().REFERENCE_SCANNER_PATH;
  if (!path.isAbsolute(file)) return false;
  try {
    await access(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function workerScannerReady() {
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
