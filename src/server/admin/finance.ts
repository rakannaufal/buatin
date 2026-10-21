import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "../db";
import { AppError } from "../errors";
import { hash, userLock } from "../limits";
import { reasonSchema, versionSchema } from "../../domain/admin";
import {
  adminMutation,
  adminReply,
  audit,
  conflict,
  createdFilter,
  listInput,
  pageSize,
  type Operator,
} from "./security";

const safePayment = {
  id: true,
  userId: true,
  planName: true,
  planId: true,
  amount: true,
  subtotal: true,
  discount: true,
  planVersion: true,
  status: true,
  reference: true,
  createdAt: true,
  paidAt: true,
  expiresAt: true,
  errorCode: true,
  checks: true,
  lastCheckedAt: true,
} as const;
export async function financeApi(
  req: NextRequest,
  actor: Operator,
  segments: string[],
  body: () => Promise<unknown>,
) {
  const [, section, id, action] = segments;
  if (section === "payments") {
    if (req.method === "GET") {
      if (id) {
        const payment = await db.payment.findUnique({
          where: { id },
          select: {
            ...safePayment,
            weeklyQuota: true,
            retentionDays: true,
            plannerLimit: true,
            features: true,
            subscription: true,
            redemption: {
              select: {
                voucherId: true,
                status: true,
                version: true,
                voucher: { select: { code: true } },
              },
            },
            refunds: true,
            events: {
              select: {
                id: true,
                source: true,
                status: true,
                createdAt: true,
                processedAt: true,
              },
              take: 50,
              orderBy: { createdAt: "desc" },
            },
          },
        });
        if (!payment) throw new AppError("NOT_FOUND", 404);
        const receipt = await db.emailMessage.findUnique({
          where: { deduplicationKey: hash(`receipt:${id}`) },
          select: { sentAt: true, attempts: true },
        });
        return adminReply({ payment, receipt });
      }
      const input = listInput(req);
      const where = {
        ...(input.q
          ? {
              OR: [
                { id: { contains: input.q } },
                { userId: input.q },
                { reference: input.q },
                {
                  user: {
                    email: { contains: input.q, mode: "insensitive" as const },
                  },
                },
              ],
            }
          : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.planId ? { planId: input.planId } : {}),
        ...(input.voucher
          ? { redemption: { voucher: { code: input.voucher.toUpperCase() } } }
          : {}),
        ...createdFilter(input),
      };
      const [items, total] = await Promise.all([
        db.payment.findMany({
          where,
          select: safePayment,
          skip: (input.page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        db.payment.count({ where }),
      ]);
      return adminReply({ items, total, page: input.page });
    }
    if (id && req.method === "POST" && (!action || action === "reconcile")) {
      const input = z
        .object({ reason: reasonSchema })
        .strict()
        .parse(await body());
      return adminReply(
        await adminMutation(
          req,
          actor,
          "finance",
          input,
          async (tx, requestId) => {
            const target = await tx.payment.findUnique({
              where: { id },
              select: { userId: true },
            });
            if (!target) throw new AppError("NOT_FOUND", 404);
            await userLock(tx, target.userId);
            const payment = await tx.payment.findUniqueOrThrow({
              where: { id },
            });
            if (payment.status !== "paid") {
              if (
                payment.lastCheckedAt &&
                Date.now() - payment.lastCheckedAt.getTime() < 60000
              )
                throw new AppError(
                  "RECONCILE_COOLDOWN",
                  429,
                  "Tunggu satu menit sebelum rekonsiliasi ulang.",
                );
              await tx.payment.update({
                where: { id },
                data: { status: "review", checks: 0, lastCheckedAt: null },
              });
            }
            await audit(
              tx,
              actor,
              "payment.reconcile.requested",
              "payment",
              id,
              input.reason,
              { status: payment.status },
              undefined,
              requestId,
            );
            return { ok: true };
          },
        ),
        202,
      );
    }
  }
  if (section !== "refunds") return null;
  if (req.method === "GET") {
    const input = listInput(req);
    const where = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.q ? { paymentId: input.q } : {}),
    };
    const [items, total] = await Promise.all([
      db.refundRequest.findMany({
        where,
        take: pageSize,
        skip: (input.page - 1) * pageSize,
        orderBy: { createdAt: "desc" },
      }),
      db.refundRequest.count({ where }),
    ]);
    return adminReply({ items, total, page: input.page });
  }
  if (req.method !== "POST") return null;
  if (!id) {
    const input = z
      .object({ paymentId: z.string().min(1).max(100), reason: reasonSchema })
      .strict()
      .parse(await body());
    return adminReply(
      await adminMutation(
        req,
        actor,
        "finance",
        input,
        async (tx, requestId) => {
          const payment = await tx.payment.findUnique({
            where: { id: input.paymentId },
          });
          if (!payment || payment.status !== "paid")
            throw new AppError("PAYMENT_NOT_PAID", 409);
          await userLock(tx, payment.userId);
          const other = await tx.refundRequest.count({
            where: {
              paymentId: payment.id,
              status: { notIn: ["rejected", "failed"] },
            },
          });
          if (other)
            throw new AppError(
              "REFUND_EXISTS",
              409,
              "Permintaan refund aktif/sudah selesai tersedia. Periksa riwayat.",
            );
          // Full refunds only: partial entitlement/proration policy is deliberately not guessed.
          const refund = await tx.refundRequest.create({
            data: {
              paymentId: payment.id,
              amount: payment.amount,
              reason: input.reason,
              createdBy: actor.id,
            },
          });
          await audit(
            tx,
            actor,
            "refund.requested",
            "refund",
            refund.id,
            input.reason,
            undefined,
            { paymentId: payment.id, amount: payment.amount },
            requestId,
          );
          return { id: refund.id };
        },
      ),
      201,
    );
  }
  const input = z
    .object({
      version: versionSchema,
      status: z.enum([
        "approved",
        "processing",
        "completed",
        "rejected",
        "failed",
      ]),
      reason: reasonSchema,
      evidence: z.string().trim().max(1000).default(""),
      providerReference: z.string().trim().max(100).default(""),
    })
    .strict()
    .parse(await body());
  return adminReply(
    await adminMutation(
      req,
      actor,
      "refund.approve",
      input,
      async (tx, requestId) => {
        const prior = await tx.refundRequest.findUnique({
          where: { id },
          include: { payment: true },
        });
        if (!prior) throw new AppError("NOT_FOUND", 404);
        await userLock(tx, prior.payment.userId);
        if (prior.version !== input.version) conflict();
        const transitions: Record<string, string[]> = {
          requested: ["approved", "rejected"],
          approved: ["processing", "rejected"],
          processing: ["completed", "failed"],
        };
        if (!transitions[prior.status]?.includes(input.status))
          throw new AppError("REFUND_TRANSITION", 409);
        if (
          ["completed", "failed"].includes(input.status) &&
          (input.evidence.length < 12 || input.providerReference.length < 4)
        )
          throw new AppError(
            "REFUND_EVIDENCE_REQUIRED",
            400,
            "Sertakan referensi merchant dan bukti hasil pengembalian uang yang sudah diverifikasi.",
          );
        const spent = await tx.refundRequest.aggregate({
          where: {
            paymentId: prior.paymentId,
            id: { not: id },
            status: { in: ["approved", "processing", "completed"] },
          },
          _sum: { amount: true },
        });
        if ((spent._sum.amount ?? 0) + prior.amount > prior.payment.amount)
          throw new AppError("REFUND_LIMIT", 409);
        await tx.refundRequest.update({
          where: { id },
          data: {
            status: input.status,
            evidence: input.evidence || prior.evidence,
            providerReference:
              input.providerReference || prior.providerReference,
            ...(input.status === "approved" ? { approvedBy: actor.id } : {}),
            version: { increment: 1 },
          },
        });
        if (input.status === "completed")
          await tx.subscription.updateMany({
            where: { paymentId: prior.paymentId, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        await audit(
          tx,
          actor,
          `refund.${input.status}`,
          "refund",
          id,
          input.reason,
          { status: prior.status },
          {
            status: input.status,
            evidence: input.evidence,
            providerReference: input.providerReference,
          },
          requestId,
        );
        return { ok: true };
      },
    ),
  );
}
