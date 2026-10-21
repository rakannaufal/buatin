import { z } from "zod";
import { db, json } from "./db";
import { AppError } from "./errors";
import { getEnv } from "./config";
import { userLock, hash, rateLimit } from "./limits";
import {
  createQris,
  checkDuitku,
  paymentConfigured,
  validDuitkuSignature,
} from "./duitku";
import { queueEmail } from "./email";
import {
  addBillingMonth,
  formatDate,
  rupiah,
  PLAN_IDS,
  type PlanId,
} from "../domain/billing";

export async function billingPlans() {
  const plans = await db.billingPlan.findMany();
  return PLAN_IDS.flatMap((id) => plans.filter((plan) => plan.id === id));
}
export async function checkout(
  user: { id: string; name: string; email: string },
  planId: PlanId,
  key: string,
) {
  if (planId === "free") throw new AppError("INVALID_PLAN", 400);
  await rateLimit(`checkout:${user.id}`, 10, 3600);
  const keyHash = hash(key),
    operation = "checkout",
    requestHash = hash(planId);
  const result = await db.$transaction(async (tx) => {
    await userLock(tx, user.id);
    const prior = await tx.idempotencyKey.findUnique({
      where: {
        userId_operation_keyHash: { userId: user.id, operation, keyHash },
      },
    });
    if (prior) {
      if (prior.requestHash !== requestHash)
        throw new AppError("IDEMPOTENCY_CONFLICT", 409);
      return { id: prior.resourceId, created: false };
    }
    const plan = await tx.billingPlan.findUnique({ where: { id: planId } });
    if (!plan?.available || !plan.monthlyPrice || !paymentConfigured())
      throw new AppError(
        "PAYMENT_UNAVAILABLE",
        503,
        "Harga atau QRIS belum diaktifkan. Paket belum dapat dibeli.",
      );
    const future = await tx.subscription.count({
      where: { userId: user.id, startsAt: { gt: new Date() } },
    });
    if (future)
      throw new AppError(
        "RENEWAL_EXISTS",
        409,
        "Perpanjangan periode berikutnya sudah dibayar.",
      );
    const pending = await tx.payment.findFirst({
      where: {
        userId: user.id,
        status: { in: ["creating", "pending", "review"] },
      },
    });
    if (pending) {
      if (pending.planId !== planId)
        throw new AppError(
          "PAYMENT_PENDING",
          409,
          "Selesaikan atau tunggu tagihan yang masih tertunda sebelum mengganti paket.",
        );
      await tx.idempotencyKey.create({
        data: {
          userId: user.id,
          operation,
          keyHash,
          requestHash,
          resourceId: pending.id,
        },
      });
      return { id: pending.id, created: false };
    }
    const payment = await tx.payment.create({
      data: {
        id: `BT${crypto.randomUUID().replaceAll("-", "")}`,
        userId: user.id,
        planId,
        planName: plan.name,
        amount: plan.monthlyPrice,
        weeklyQuota: plan.weeklyQuota,
        retentionDays: plan.retentionDays,
        priority: plan.priority,
        method: getEnv().DUITKU_QRIS_METHOD,
        expiresAt: new Date(
          Date.now() + getEnv().DUITKU_EXPIRY_MINUTES * 60000,
        ),
      },
    });
    await tx.idempotencyKey.create({
      data: {
        userId: user.id,
        operation,
        keyHash,
        requestHash,
        resourceId: payment.id,
      },
    });
    return { id: payment.id, created: true };
  });
  if (result.created) {
    const payment = await db.payment.findUniqueOrThrow({
      where: { id: result.id },
    });
    try {
      const qr = await createQris({
        id: payment.id,
        amount: payment.amount,
        email: user.email,
        name: payment.planName,
        customer: user.name,
      });
      await db.$transaction(async (tx) => {
        await userLock(tx, user.id);
        const current = await tx.payment.findUniqueOrThrow({
          where: { id: payment.id },
        });
        if (current.reference && current.reference !== qr.reference)
          throw new AppError("PAYMENT_REFERENCE", 502);
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            reference: qr.reference,
            qrString: qr.qrString,
            ...(current.status === "creating" ? { status: "pending" } : {}),
          },
        });
      });
    } catch (error) {
      const certain =
        error instanceof AppError &&
        ["QRIS_UNAVAILABLE", "PAYMENT_UNAVAILABLE"].includes(error.code);
      await db.payment.updateMany({
        where: { id: payment.id, status: "creating" },
        data: {
          status: certain ? "failed" : "creating",
          errorCode: certain ? "QRIS_UNAVAILABLE" : "PROVIDER_UNCERTAIN",
        },
      });
      // Keep an uncertain order for reconciliation instead of creating a second payable invoice.
      if (certain) throw error;
    }
  }
  return { id: result.id };
}
export const callbackSchema = z.object({
  merchantCode: z.string().min(1).max(50),
  merchantOrderId: z.string().min(1).max(64),
  amount: z
    .string()
    .regex(/^[0-9]+$/)
    .max(12),
  reference: z.string().min(1).max(100),
  paymentCode: z.enum(["NQ", "SQ"]),
  resultCode: z.enum(["00", "01"]),
  signature: z.string().max(64),
});
export async function receiveCallback(input: unknown) {
  const data = callbackSchema.parse(input),
    env = getEnv();
  if (
    !env.DUITKU_API_KEY ||
    data.merchantCode !== env.DUITKU_MERCHANT_CODE ||
    !validDuitkuSignature(
      data.merchantCode + data.amount + data.merchantOrderId,
      data.signature,
      env.DUITKU_API_KEY,
    )
  )
    throw new AppError("INVALID_SIGNATURE", 401, "Signature tidak valid.");
  const payment = await db.payment.findUnique({
    where: { id: data.merchantOrderId },
  });
  if (
    !payment ||
    payment.amount !== Number(data.amount) ||
    payment.method !== data.paymentCode ||
    (payment.reference && payment.reference !== data.reference)
  )
    throw new AppError("PAYMENT_MISMATCH", 400);
  await db.$transaction(async (tx) => {
    await userLock(tx, payment.userId);
    const id = hash(`${payment.id}:${data.reference}:${data.resultCode}`);
    const current = await tx.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    if (current.reference && current.reference !== data.reference)
      throw new AppError("PAYMENT_MISMATCH", 400);
    if (await tx.webhookEvent.findUnique({ where: { id } })) return;
    await tx.webhookEvent.create({
      data: {
        id,
        paymentId: payment.id,
        source: "callback",
        status: data.resultCode,
        payload: json({
          reference: data.reference,
          amount: Number(data.amount),
          paymentCode: data.paymentCode,
        }),
        processedAt: current.status === "paid" ? new Date() : null,
      },
    });
    if (current.status !== "paid")
      await tx.payment.update({
        where: { id: payment.id },
        // A new signed notification permits one final check after the polling cap.
        data: {
          reference: current.reference ?? data.reference,
          lastCheckedAt: null,
          checks: Math.min(current.checks, 11),
        },
      });
  });
}
export async function reconcilePayment(id: string) {
  const payment = await db.payment.findUnique({ where: { id } });
  if (!payment || payment.status === "paid" || !paymentConfigured()) return;
  const delay = Math.min(1800, 60 * 2 ** Math.min(payment.checks, 5)) * 1000;
  if (
    payment.checks >= 12 ||
    (payment.lastCheckedAt &&
      Date.now() - payment.lastCheckedAt.getTime() < delay)
  )
    return;
  const claimed = await db.payment.updateMany({
    where: { id, checks: payment.checks, status: { not: "paid" } },
    data: { checks: { increment: 1 }, lastCheckedAt: new Date() },
  });
  if (!claimed.count) return;
  const status = await checkDuitku(id);
  if (
    status.merchantOrderId !== id ||
    status.amount !== payment.amount ||
    (payment.reference && status.reference !== payment.reference)
  ) {
    await db.payment.updateMany({
      where: { id, status: { not: "paid" } },
      data: { status: "review", errorCode: "PAYMENT_MISMATCH" },
    });
    throw new AppError("PAYMENT_MISMATCH", 502);
  }
  await db.$transaction(async (tx) => {
    await userLock(tx, payment.userId);
    const current = await tx.payment.findUniqueOrThrow({ where: { id } });
    if (current.status === "paid") return;
    const now = new Date();
    const eventId = hash(`status:${id}:${status.statusCode}`);
    await tx.webhookEvent.upsert({
      where: { id: eventId },
      create: {
        id: eventId,
        paymentId: id,
        source: "reconciliation",
        status: status.statusCode,
        payload: json(status),
        processedAt: now,
      },
      update: { processedAt: now },
    });
    if (status.statusCode === "00") {
      const latest = await tx.subscription.findFirst({
        where: { userId: payment.userId, endsAt: { gt: now } },
        orderBy: { endsAt: "desc" },
      });
      const startsAt = latest?.endsAt ?? now,
        endsAt = addBillingMonth(startsAt);
      await tx.subscription.create({
        data: {
          userId: payment.userId,
          paymentId: id,
          planId: payment.planId,
          startsAt,
          endsAt,
          weeklyQuota: payment.weeklyQuota,
          retentionDays: payment.retentionDays,
          priority: payment.priority,
        },
      });
      await tx.payment.update({
        where: { id },
        data: {
          status: "paid",
          paidAt: now,
          reference: status.reference,
          errorCode: null,
        },
      });
      const user = await tx.user.findUniqueOrThrow({
        where: { id: payment.userId },
      });
      await queueEmail(
        user.email,
        "Pembayaran Buatin diterima",
        `${payment.planName}: ${rupiah(payment.amount)}.\nPeriode ${formatDate(startsAt)} sampai ${formatDate(endsAt)}.\nKuota mingguan tetap mengikuti Senin 00.00 WIB.\nTagihan: ${getEnv().APP_URL}/billing/${id}`,
        `receipt:${id}`,
        tx,
      );
      await tx.auditEvent.create({
        data: {
          userId: payment.userId,
          action: "payment.paid",
          resourceId: id,
        },
      });
    } else if (status.statusCode === "02") {
      await tx.payment.update({
        where: { id },
        data: { status: "expired", errorCode: null },
      });
    }
    await tx.webhookEvent.updateMany({
      where: { paymentId: id, source: "callback", processedAt: null },
      data: { processedAt: now },
    });
  });
}
export async function maintainBilling() {
  if (paymentConfigured()) {
    const payments = await db.payment.findMany({
      where: {
        status: { in: ["creating", "pending", "review", "expired"] },
        checks: { lt: 12 },
        OR: [
          { createdAt: { lt: new Date(Date.now() - 5 * 60000) } },
          { events: { some: { processedAt: null } } },
        ],
      },
      take: 10,
      orderBy: { lastCheckedAt: { sort: "asc", nulls: "first" } },
    });
    for (const payment of payments) {
      try {
        await reconcilePayment(payment.id);
      } catch {
        console.error(
          JSON.stringify({
            event: "payment.reconciliation.failed",
            id: payment.id,
          }),
        );
      }
    }
  }
  const now = new Date();
  const subscriptions = await db.subscription.findMany({
    where: {
      reminderSentAt: null,
      startsAt: { lte: now },
      endsAt: { gt: now, lte: new Date(Date.now() + 3 * 86400000) },
      user: { renewalReminders: true },
    },
    include: { user: true, plan: true },
    take: 30,
  });
  for (const subscription of subscriptions) {
    const renewed = await db.subscription.count({
      where: {
        userId: subscription.userId,
        startsAt: { gte: subscription.endsAt },
      },
    });
    if (!renewed)
      await queueEmail(
        subscription.user.email,
        "Masa Pro Buatin segera berakhir",
        `${subscription.plan.name} berakhir ${formatDate(subscription.endsAt)}.\nPerpanjang manual melalui QRIS: ${getEnv().APP_URL}/billing\nTidak ada penagihan otomatis.`,
        `renewal:${subscription.id}`,
      );
    await db.subscription.update({
      where: { id: subscription.id },
      data: { reminderSentAt: now },
    });
  }
}
