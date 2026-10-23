import { db, type Transaction } from "./db";
import { AppError } from "./errors";
import { userLock } from "./limits";
import {
  PLANS,
  weekPeriod,
  type PlanId,
  type ProFeature,
} from "../domain/billing";
import { planFeatures } from "../domain/admin";
import { activeUser } from "./admin/security";
import { assertServiceOpen } from "./admin/policies";

export async function entitlementFor(
  userId: string,
  tx: Transaction = db,
  now = new Date(),
) {
  const paid = await tx.subscription.findFirst({
    where: {
      userId,
      revokedAt: null,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    orderBy: { startsAt: "desc" },
  });
  const grant = await tx.entitlementGrant.findFirst({
    where: {
      userId,
      revokedAt: null,
      startsAt: { lte: now },
      endsAt: { gt: now },
    },
    orderBy: { startsAt: "desc" },
  });
  const active = paid ?? grant;
  const free = active
    ? null
    : await tx.billingPlan.findUnique({ where: { id: "free" } });
  const planId = (active?.planId ?? "free") as PlanId;
  const period = active
    ? weekPeriod(now)
    : { key: "lifetime", startsAt: new Date(0), endsAt: null };
  const usage = await tx.usagePeriod.findUnique({
    where: { userId_key: { userId, key: period.key } },
  });
  const limit = active?.weeklyQuota ?? free?.weeklyQuota ?? 1;
  const baseRemaining = Math.max(0, limit - (usage?.jobsCount ?? 0));
  const credits = await tx.creditGrant.findMany({
    where: { userId, revokedAt: null, expiresAt: { gt: now } },
    select: { amount: true, used: true },
  });
  const creditRemaining = credits.reduce(
    (sum, credit) => sum + credit.amount - credit.used,
    0,
  );
  return {
    planId,
    name: active?.planName ?? free?.name ?? PLANS[planId].name,
    limit,
    used: usage?.jobsCount ?? 0,
    remaining: baseRemaining + creditRemaining,
    baseRemaining,
    creditRemaining,
    plannerLimit:
      active?.plannerLimit ??
      free?.plannerLimit ??
      (active ? Math.min(120, limit * 4) : 5),
    plannerUsed: usage?.plansCount ?? 0,
    retentionDays: active?.retentionDays ?? free?.retentionDays ?? 14,
    priority: active?.priority ?? 0,
    periodKey: period.key,
    startsAt: period.startsAt,
    resetsAt: period.endsAt,
    activeUntil: active?.endsAt ?? null,
    features: planFeatures(planId, active?.features ?? free?.features),
  };
}
export type Entitlement = Awaited<ReturnType<typeof entitlementFor>>;
export async function requireFeature(
  userId: string,
  feature: ProFeature,
  tx: Transaction = db,
) {
  const entitlement = await entitlementFor(userId, tx);
  if (!entitlement.features[feature])
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
  await activeUser(userId, tx);
  await assertServiceOpen("Generation", tx);
  if (entitlement.remaining < 1)
    throw new AppError(
      "QUOTA_EXHAUSTED",
      429,
      entitlement.planId === "free"
        ? "Kesempatan Free sudah digunakan. Pilih Pro untuk membuat paket baru."
        : "Kuota minggu ini habis. Kuota berikutnya tersedia Senin 00.00 WIB selama paket aktif.",
    );
  if (entitlement.baseRemaining < 1) {
    const grants = await tx.creditGrant.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
    });
    const grant = grants.find((item) => item.used < item.amount);
    if (!grant) throw new AppError("QUOTA_EXHAUSTED", 429);
    await tx.creditGrant.update({
      where: { id: grant.id },
      data: { used: { increment: 1 } },
    });
    await tx.creditAllocation.create({ data: { grantId: grant.id, jobId } });
    return;
  }
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
// Cancellation refunds only work that produced neither provider requests nor readable checkpoints.
export async function refundUnusedJobQuota(
  tx: Transaction,
  userId: string,
  jobId: string,
  reason: string,
) {
  const job = await tx.job.findFirst({
    where: { id: jobId, userId },
    select: { llmRequestCount: true },
  });
  if (
    !job ||
    job.llmRequestCount !== 0 ||
    (await tx.jobFile.count({ where: { jobId, status: "succeeded" } }))
  )
    return;
  await refundQuota(tx, userId, jobId, reason);
}
// Caller holds the account advisory lock; the unique ledger entry prevents double refunds.
export async function refundQuota(
  tx: Transaction,
  userId: string,
  jobId: string,
  reason: string,
) {
  const allocation = await tx.creditAllocation.findUnique({
    where: { jobId },
    include: { grant: true },
  });
  if (allocation) {
    if (allocation.grant.userId !== userId || allocation.returnedAt) return;
    await tx.creditAllocation.update({
      where: { jobId },
      data: { status: "returned", returnedAt: new Date() },
    });
    await tx.creditGrant.update({
      where: { id: allocation.grantId },
      data: { used: { decrement: 1 } },
    });
    await tx.job.update({
      where: { id: jobId },
      data: { quotaRefundedAt: new Date() },
    });
    return;
  }
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
  await activeUser(userId, tx);
  await assertServiceOpen("Generation", tx);
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
