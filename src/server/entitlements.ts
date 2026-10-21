import { db, type Transaction } from "./db";
import { AppError } from "./errors";
import { userLock } from "./limits";
import {
  PLANS,
  hasFeature,
  weekPeriod,
  type PlanId,
  type ProFeature,
} from "../domain/billing";

export async function entitlementFor(
  userId: string,
  tx: Transaction = db,
  now = new Date(),
) {
  const active = await tx.subscription.findFirst({
    where: { userId, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { startsAt: "desc" },
  });
  const planId = (active?.planId ?? "free") as PlanId;
  const period = active
    ? weekPeriod(now)
    : { key: "lifetime", startsAt: new Date(0), endsAt: null };
  const usage = await tx.usagePeriod.findUnique({
    where: { userId_key: { userId, key: period.key } },
  });
  const limit = active?.weeklyQuota ?? 1;
  return {
    planId,
    name: PLANS[planId].name,
    limit,
    used: usage?.jobsCount ?? 0,
    remaining: Math.max(0, limit - (usage?.jobsCount ?? 0)),
    plannerLimit: active ? Math.min(120, limit * 4) : 5,
    plannerUsed: usage?.plansCount ?? 0,
    retentionDays: active?.retentionDays ?? 14,
    priority: active?.priority ?? 0,
    periodKey: period.key,
    startsAt: period.startsAt,
    resetsAt: period.endsAt,
    activeUntil: active?.endsAt ?? null,
    features: {
      revisions: hasFeature(planId, "revisions"),
      regeneration: hasFeature(planId, "regeneration"),
      presets: hasFeature(planId, "presets"),
      templates: hasFeature(planId, "templates"),
      batch: hasFeature(planId, "batch"),
    },
  };
}
export type Entitlement = Awaited<ReturnType<typeof entitlementFor>>;
export async function requireFeature(
  userId: string,
  feature: ProFeature,
  tx: Transaction = db,
) {
  const entitlement = await entitlementFor(userId, tx);
  if (!hasFeature(entitlement.planId, feature))
    throw new AppError(
      "PLAN_REQUIRED",
      403,
      `Fitur ini memerlukan ${feature === "batch" || feature === "templates" ? "Pro Max" : "Pro Plus"}.`,
    );
  return entitlement;
}
export async function reserveQuota(
  tx: Transaction,
  userId: string,
  jobId: string,
  entitlement: Entitlement,
) {
  if (entitlement.remaining < 1)
    throw new AppError(
      "QUOTA_EXHAUSTED",
      429,
      entitlement.planId === "free"
        ? "Kesempatan Free sudah digunakan. Pilih Pro untuk membuat paket baru."
        : "Kuota minggu ini habis. Kuota berikutnya tersedia Senin 00.00 WIB selama paket aktif.",
    );
  await tx.usagePeriod.upsert({
    where: { userId_key: { userId, key: entitlement.periodKey } },
    create: {
      userId,
      key: entitlement.periodKey,
      startsAt: entitlement.startsAt,
      endsAt: entitlement.resetsAt,
      jobsCount: 1,
    },
    update: { jobsCount: { increment: 1 } },
  });
  await tx.quotaLedger.create({
    data: {
      userId,
      periodKey: entitlement.periodKey,
      jobId,
      action: "reserve",
      delta: 1,
    },
  });
}
// Caller holds the account advisory lock; the unique ledger entry prevents double refunds.
export async function refundQuota(
  tx: Transaction,
  userId: string,
  jobId: string,
  reason: string,
) {
  const reservation = await tx.quotaLedger.findUnique({
    where: { jobId_action: { jobId, action: "reserve" } },
  });
  if (
    !reservation ||
    (await tx.quotaLedger.findUnique({
      where: { jobId_action: { jobId, action: "refund" } },
    }))
  )
    return;
  await tx.quotaLedger.create({
    data: {
      userId,
      jobId,
      periodKey: reservation.periodKey,
      action: "refund",
      delta: -1,
      reason,
    },
  });
  await tx.usagePeriod.updateMany({
    where: { userId, key: reservation.periodKey, jobsCount: { gt: 0 } },
    data: { jobsCount: { decrement: 1 } },
  });
  await tx.job.update({
    where: { id: jobId },
    data: { quotaRefundedAt: new Date() },
  });
}
export async function closeFailedJob(userId: string, id: string) {
  return db.$transaction(async (tx) => {
    await userLock(tx, userId);
    const job = await tx.job.findFirst({ where: { id, userId } });
    if (!job) throw new AppError("NOT_FOUND", 404);
    if (!["failed", "partial"].includes(job.status))
      throw new AppError(
        "NOT_FAILED",
        409,
        "Hanya proses gagal yang dapat ditutup.",
      );
    await refundQuota(tx, userId, id, "system_failure_closed");
    await tx.job.update({
      where: { id },
      data: { status: "failed", errorCode: "CLOSED_REFUNDED" },
    });
    return { id };
  });
}
export async function reservePlanner(tx: Transaction, userId: string) {
  const entitlement = await entitlementFor(userId, tx);
  if (entitlement.remaining < 1)
    throw new AppError(
      "QUOTA_EXHAUSTED",
      429,
      "Kuota generasi habis. Pilih paket atau tunggu periode berikutnya.",
    );
  if (entitlement.plannerUsed >= entitlement.plannerLimit)
    throw new AppError(
      "PLANNER_QUOTA",
      429,
      "Batas penyusunan rencana periode ini tercapai.",
    );
  await tx.usagePeriod.upsert({
    where: { userId_key: { userId, key: entitlement.periodKey } },
    create: {
      userId,
      key: entitlement.periodKey,
      startsAt: entitlement.startsAt,
      endsAt: entitlement.resetsAt,
      plansCount: 1,
    },
    update: { plansCount: { increment: 1 } },
  });
  return entitlement;
}
