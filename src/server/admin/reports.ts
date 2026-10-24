import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "../db";
import { AppError } from "../errors";
import { reasonSchema } from "../../domain/admin";
import { adminMutation, adminReply, audit, type Operator } from "./security";
export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]|^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function range(req: NextRequest) {
  const input = z
    .object({ from: z.iso.date().optional(), to: z.iso.date().optional() })
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  const to = input.to ? new Date(`${input.to}T23:59:59.999Z`) : new Date();
  const from = input.from
    ? new Date(`${input.from}T00:00:00Z`)
    : new Date(to.getTime() - 30 * 86400000);
  if (from >= to || to.getTime() - from.getTime() > 366 * 86400000)
    throw new AppError(
      "REPORT_RANGE",
      400,
      "Rentang laporan maksimal 366 hari, tanggal UTC.",
    );
  return { from, to };
}
export async function reportsApi(
  req: NextRequest,
  actor: Operator,
  segments: string[],
  body: () => Promise<unknown>,
) {
  const [, section, action] = segments;
  if (!["reports", "ai"].includes(section)) return null;
  const { from, to } = range(req);
  if (req.method === "GET" && section === "ai") {
    const input = z
      .object({
        page: z.coerce.number().int().min(1).max(10000).default(1),
        q: z.string().max(100).default(""),
        model: z.string().trim().max(160).default(""),
      })
      .parse(Object.fromEntries(req.nextUrl.searchParams));
    const where = {
      createdAt: { gte: from, lte: to },
      ...(input.q ? { userId: input.q } : {}),
      ...(input.model
        ? { OR: [{ model: input.model }, { modelUsed: input.model }] }
        : {}),
    };
    const [entries, total] = await Promise.all([
      db.aiUsage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: (input.page - 1) * 20,
        select: {
          id: true,
          userId: true,
          resourceId: true,
          task: true,
          model: true,
          modelUsed: true,
          tokensIn: true,
          tokensOut: true,
          reservedTokens: true,
          estimatedCostMicros: true,
          pricingVersion: true,
          inputRate: true,
          outputRate: true,
          mock: true,
          status: true,
          createdAt: true,
        },
      }),
      db.aiUsage.count({ where }),
    ]);
    return adminReply({
      items: entries.map((entry) => ({
        ...entry,
        estimatedCostMicros:
          entry.estimatedCostMicros === null
            ? null
            : String(entry.estimatedCostMicros),
      })),
      total,
      page: input.page,
    });
  }
  if (req.method === "GET") {
    const [paid, refunds, users, active, jobs, ai, unpriced] =
      await Promise.all([
        db.payment.aggregate({
          where: { status: "paid", paidAt: { gte: from, lte: to } },
          _count: { _all: true },
          _sum: { amount: true, discount: true, subtotal: true },
        }),
        db.refundRequest.aggregate({
          where: { status: "completed", updatedAt: { gte: from, lte: to } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        db.user.count({ where: { createdAt: { gte: from, lte: to } } }),
        db.subscription.groupBy({
          by: ["userId"],
          where: {
            revokedAt: null,
            startsAt: { lte: new Date() },
            endsAt: { gt: new Date() },
          },
        }),
        db.job.groupBy({
          by: ["status"],
          where: { createdAt: { gte: from, lte: to } },
          _count: { _all: true },
        }),
        db.aiUsage.aggregate({
          where: { createdAt: { gte: from, lte: to }, mock: false },
          _sum: { tokensIn: true, tokensOut: true, estimatedCostMicros: true },
          _count: { _all: true },
        }),
        db.aiUsage.count({
          where: {
            createdAt: { gte: from, lte: to },
            mock: false,
            OR: [{ inputRate: null }, { outputRate: null }],
          },
        }),
      ]);
    return adminReply({
      from,
      to,
      paid: {
        count: paid._count._all,
        subtotal: paid._sum.subtotal ?? 0,
        discount: paid._sum.discount ?? 0,
        amount: paid._sum.amount ?? 0,
      },
      refunds: { amount: refunds._sum.amount ?? 0, count: refunds._count._all },
      netAfterRefunds: (paid._sum.amount ?? 0) - (refunds._sum.amount ?? 0),
      newUsers: users,
      activePaidAccounts: active.length,
      jobs: jobs.map((job) => ({ status: job.status, count: job._count._all })),
      ai: {
        unpriced,
        attempts: ai._count._all,
        tokensIn: ai._sum.tokensIn,
        tokensOut: ai._sum.tokensOut,
        estimatedCostMicros: String(ai._sum.estimatedCostMicros ?? 0),
      },
    });
  }
  if (action === "export" && req.method === "POST") {
    if (to.getTime() - from.getTime() > 31 * 86400000)
      throw new AppError(
        "EXPORT_RANGE",
        400,
        "Ekspor maksimal 31 hari dan 1.000 invoice; gunakan rentang lebih kecil bila terpotong.",
      );
    const input = z
      .object({ reason: reasonSchema })
      .strict()
      .parse(await body());
    const rows = await adminMutation(
      req,
      actor,
      "finance",
      { ...input, from: from.toISOString(), to: to.toISOString() },
      async (tx, requestId) => {
        const entries = await tx.payment.findMany({
          where: { createdAt: { gte: from, lte: to } },
          orderBy: { createdAt: "asc" },
          take: 1001,
          select: {
            id: true,
            planName: true,
            subtotal: true,
            discount: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        });
        if (entries.length > 1000)
          throw new AppError(
            "EXPORT_LIMIT",
            400,
            "Terlalu banyak invoice. Persempit rentang tanggal.",
          );
        await audit(
          tx,
          actor,
          "report.exported",
          "report",
          requestId,
          input.reason,
          undefined,
          { count: entries.length, from, to },
          requestId,
        );
        return entries.map((entry) => [
          entry.id,
          entry.planName,
          entry.subtotal,
          entry.discount,
          entry.amount,
          entry.status,
          entry.createdAt.toISOString(),
        ]);
      },
    );
    const csv = [
      [
        "Invoice",
        "Plan",
        "Subtotal IDR",
        "Discount IDR",
        "Paid total IDR",
        "Status",
        "Created UTC",
      ],
      ...rows,
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="bantuin-payments.csv"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return null;
}
