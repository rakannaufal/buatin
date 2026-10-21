import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db, type Transaction } from "./db";
import { getEnv } from "./config";
import { AppError } from "./errors";
import { userLock } from "./limits";
import { voucherCode, discountFor } from "../domain/admin";
import type { PlanId } from "../domain/billing";

const quoteSchema = z
  .object({
    userId: z.string(),
    planId: z.string(),
    planVersion: z.number().int(),
    code: z.string(),
    voucherId: z.string().nullable(),
    voucherVersion: z.number().int().nullable(),
    subtotal: z.number().int(),
    discount: z.number().int(),
    amount: z.number().int(),
    expiresAt: z.number().int(),
  })
  .strict();
export type BillingQuote = z.infer<typeof quoteSchema> & { signature: string };
function signature(value: z.infer<typeof quoteSchema>) {
  return createHmac("sha256", getEnv().BETTER_AUTH_SECRET)
    .update(JSON.stringify(value))
    .digest("hex");
}
export async function voucherLock(tx: Transaction, code: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`voucher:${code}`}))`;
}
export async function quoteInTransaction(
  tx: Transaction,
  userId: string,
  planId: PlanId,
  code = "",
) {
  const plan = await tx.billingPlan.findUnique({ where: { id: planId } });
  if (planId === "free" || !plan?.available || !plan.monthlyPrice)
    throw new AppError(
      "PAYMENT_UNAVAILABLE",
      503,
      "Paket belum tersedia untuk dibeli.",
    );
  code = voucherCode(code);
  let discount = 0;
  let voucher: Awaited<ReturnType<typeof tx.voucher.findUnique>> = null;
  if (code) {
    await voucherLock(tx, code);
    voucher = await tx.voucher.findUnique({ where: { code } });
    const now = new Date();
    if (
      !voucher ||
      voucher.status !== "active" ||
      voucher.startsAt > now ||
      voucher.endsAt <= now ||
      !Array.isArray(voucher.planIds) ||
      !voucher.planIds.includes(planId) ||
      !Array.isArray(voucher.userIds) ||
      (voucher.userIds.length > 0 && !voucher.userIds.includes(userId)) ||
      plan.monthlyPrice < voucher.minimumAmount
    )
      throw new AppError(
        "VOUCHER_UNAVAILABLE",
        400,
        "Voucher tidak berlaku untuk pembelian ini.",
      );
    if (
      voucher.newCustomersOnly &&
      (await tx.payment.count({ where: { userId, status: "paid" } }))
    )
      throw new AppError(
        "VOUCHER_UNAVAILABLE",
        400,
        "Voucher tidak berlaku untuk pembelian ini.",
      );
    const where = {
      voucherId: voucher.id,
      status: { in: ["reserved", "consumed", "review"] },
    };
    const [used, perUser] = await Promise.all([
      tx.voucherRedemption.count({ where }),
      tx.voucherRedemption.count({ where: { ...where, userId } }),
    ]);
    if (used >= voucher.maxUses || perUser >= voucher.perUserLimit)
      throw new AppError(
        "VOUCHER_LIMIT",
        409,
        "Batas pemakaian voucher sudah tercapai.",
      );
    discount = discountFor(plan.monthlyPrice, voucher);
  }
  const amount = plan.monthlyPrice - discount;
  if (amount < 1000)
    throw new AppError(
      "PAYMENT_MINIMUM",
      400,
      "Total QRIS minimal Rp1.000. Gunakan grant untuk akses gratis.",
    );
  return { plan, voucher, code, subtotal: plan.monthlyPrice, discount, amount };
}
export async function billingQuote(
  userId: string,
  planId: PlanId,
  code = "",
): Promise<BillingQuote> {
  return db.$transaction(async (tx) => {
    await userLock(tx, userId);
    const value = await quoteInTransaction(tx, userId, planId, code);
    const quote = {
      userId,
      planId,
      planVersion: value.plan.version,
      code: value.code,
      voucherId: value.voucher?.id ?? null,
      voucherVersion: value.voucher?.version ?? null,
      subtotal: value.subtotal,
      discount: value.discount,
      amount: value.amount,
      expiresAt: Date.now() + 5 * 60000,
    };
    return { ...quote, signature: signature(quote) };
  });
}
export function verifyQuote(
  input: unknown,
  userId: string,
  planId: string,
  allowExpired = false,
) {
  const parsed = quoteSchema
    .extend({ signature: z.string().regex(/^[a-f0-9]{64}$/) })
    .parse(input);
  const { signature: supplied, ...value } = parsed;
  if (
    value.userId !== userId ||
    value.planId !== planId ||
    (!allowExpired && value.expiresAt <= Date.now()) ||
    !timingSafeEqual(
      Buffer.from(supplied, "hex"),
      Buffer.from(signature(value), "hex"),
    )
  )
    throw new AppError(
      "QUOTE_EXPIRED",
      409,
      "Rincian harga kedaluwarsa atau tidak valid. Periksa total kembali.",
    );
  return value;
}
export async function settleVoucher(
  tx: Transaction,
  paymentId: string,
  paid: boolean,
) {
  const redemption = await tx.voucherRedemption.findUnique({
    where: { paymentId },
    include: { voucher: { select: { code: true } } },
  });
  if (
    !redemption ||
    redemption.status === "consumed" ||
    redemption.status === "review"
  )
    return;
  await voucherLock(tx, redemption.voucher.code);
  const late = paid && redemption.status === "released";
  await tx.voucherRedemption.update({
    where: { paymentId },
    data: { status: paid ? (late ? "review" : "consumed") : "released" },
  });
  if (late)
    await tx.auditEvent.create({
      data: {
        action: "voucher.late_payment.review",
        targetType: "payment",
        resourceId: paymentId,
        reason:
          "Provider confirmed payment after a final release; paid access preserved.",
      },
    });
}
