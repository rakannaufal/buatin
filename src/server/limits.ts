import { createHash } from "node:crypto";
import { db, type Transaction } from "./db";
import { AppError } from "./errors";
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function userLock(tx: Transaction, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
}
export async function rateLimit(key: string, max: number, seconds: number) {
  const now = new Date();
  const expires = new Date(now.getTime() + seconds * 1000);
  const result = await db.$queryRaw<
    { count: number }[]
  >`INSERT INTO "RequestLimit" ("key","count","expiresAt") VALUES (${hash(key)},1,${expires}) ON CONFLICT ("key") DO UPDATE SET "count"=CASE WHEN "RequestLimit"."expiresAt"<${now} THEN 1 ELSE "RequestLimit"."count"+1 END,"expiresAt"=CASE WHEN "RequestLimit"."expiresAt"<${now} THEN ${expires} ELSE "RequestLimit"."expiresAt" END RETURNING "count"`;
  if (result[0].count > max)
    throw new AppError(
      "RATE_LIMITED",
      429,
      "Terlalu banyak permintaan. Coba lagi nanti.",
    );
}
