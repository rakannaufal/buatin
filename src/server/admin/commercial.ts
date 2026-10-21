import type { NextRequest } from "next/server";
import { z } from "zod";
import { db, json } from "../db";
import { AppError } from "../errors";
import {
  planIdSchema,
  planEditSchema,
  planFeatures,
  reasonSchema,
  versionSchema,
  voucherSchema,
} from "../../domain/admin";
import { voucherLock } from "../vouchers";
import {
  adminMutation,
  adminReply,
  audit,
  conflict,
  listInput,
  pageSize,
  type Operator,
} from "./security";

export async function commercialApi(
  req: NextRequest,
  actor: Operator,
  segments: string[],
  body: () => Promise<unknown>,
) {
  const [, section, id, action] = segments;
  if (section === "plans") {
    if (req.method === "GET") {
      const plans = await db.billingPlan.findMany({
        orderBy: { priority: "asc" },
      });
      return adminReply({
        items: plans.map((p) => ({
          ...p,
          features: planFeatures(planIdSchema.parse(p.id), p.features),
          plannerLimit:
            p.plannerLimit ??
            (p.id === "free" ? 5 : Math.min(120, p.weeklyQuota * 4)),
        })),
        versions: await db.billingPlanVersion.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
      });
    }
    if (id && req.method === "POST" && action === "draft") {
      const input = z
        .object({
          value: planEditSchema,
          version: versionSchema,
          reason: reasonSchema,
        })
        .strict()
        .parse(await body());
      const planId = planIdSchema.parse(id);
      if (
        id === "free" &&
        (input.value.available || input.value.monthlyPrice !== null)
      )
        throw new AppError(
          "FREE_NOT_FOR_SALE",
          400,
          "Free tidak dijual melalui checkout.",
        );
      return adminReply(
        await adminMutation(
          req,
          actor,
          "plans",
          input,
          async (tx, requestId) => {
            const plan = await tx.billingPlan.findUniqueOrThrow({
              where: { id: planId },
            });
            if (plan.version !== input.version) conflict();
            const last = await tx.billingPlanVersion.findFirst({
              where: { planId },
              orderBy: { version: "desc" },
            });
            const draft = await tx.billingPlanVersion.create({
              data: {
                planId,
                version: Math.max(plan.version, last?.version ?? 0) + 1,
                value: json({ ...input.value, baseVersion: plan.version }),
                createdBy: actor.id,
              },
            });
            await audit(
              tx,
              actor,
              "plan.drafted",
              "plan",
              planId,
              input.reason,
              undefined,
              { draftId: draft.id, version: draft.version, value: input.value },
              requestId,
            );
            return { id: draft.id };
          },
        ),
        201,
      );
    }
    if (id && action === "publish" && req.method === "POST") {
      const input = z
        .object({
          draftId: z.string(),
          version: versionSchema,
          reason: reasonSchema,
        })
        .strict()
        .parse(await body());
      return adminReply(
        await adminMutation(
          req,
          actor,
          "plans",
          input,
          async (tx, requestId) => {
            const plan = await tx.billingPlan.findUniqueOrThrow({
              where: { id: planIdSchema.parse(id) },
            });
            const draft = await tx.billingPlanVersion.findFirst({
              where: { id: input.draftId, planId: id, status: "draft" },
            });
            if (!draft || plan.version !== input.version) conflict();
            const value = z
              .object({ baseVersion: versionSchema })
              .passthrough()
              .parse(draft.value);
            if (value.baseVersion !== plan.version) conflict();
            const update = planEditSchema.parse(
              Object.fromEntries(
                Object.entries(value).filter(([key]) => key !== "baseVersion"),
              ),
            );
            if (
              id === "free" &&
              (update.available || update.monthlyPrice !== null)
            )
              throw new AppError("FREE_NOT_FOR_SALE", 400);
            await tx.billingPlan.update({
              where: { id },
              data: {
                ...update,
                features: json(update.features),
                version: draft.version,
              },
            });
            await tx.billingPlanVersion.update({
              where: { id: draft.id },
              data: {
                status: "published",
                publishedAt: new Date(),
                publishedBy: actor.id,
              },
            });
            await audit(
              tx,
              actor,
              "plan.published",
              "plan",
              id,
              input.reason,
              plan,
              { ...update, version: draft.version },
              requestId,
            );
            return { ok: true };
          },
        ),
      );
    }
    throw new AppError(
      "METHOD_NOT_ALLOWED",
      405,
      "Gunakan alur draft dan publish paket.",
    );
  }
  if (section !== "vouchers") return null;
  if (req.method === "GET") {
    const input = listInput(req);
    const where = {
      ...(input.q ? { code: { contains: input.q.toUpperCase() } } : {}),
      ...(["active", "paused", "archived"].includes(input.status)
        ? { status: input.status }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.voucher.findMany({
        where,
        skip: (input.page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              redemptions: {
                where: { status: { in: ["reserved", "consumed", "review"] } },
              },
            },
          },
        },
      }),
      db.voucher.count({ where }),
    ]);
    const redemptions = id
      ? await db.voucherRedemption.findMany({
          where: { voucherId: id },
          take: 100,
          orderBy: { createdAt: "desc" },
          include: {
            payment: {
              select: { id: true, amount: true, discount: true, status: true },
            },
          },
        })
      : [];
    const voucher = id ? await db.voucher.findUnique({ where: { id } }) : null;
    if (id && !voucher) throw new AppError("NOT_FOUND", 404);
    const versions = id
      ? await db.voucherVersion.findMany({
          where: { voucherId: id },
          orderBy: { version: "desc" },
          take: 100,
        })
      : [];
    return adminReply({
      items,
      total,
      page: input.page,
      redemptions,
      voucher,
      versions,
    });
  }
  if (req.method !== "POST" && req.method !== "PATCH") return null;
  const input = z
    .object({
      value: voucherSchema,
      version: versionSchema.optional(),
      reason: reasonSchema,
    })
    .strict()
    .parse(await body());
  return adminReply(
    await adminMutation(
      req,
      actor,
      "vouchers",
      input,
      async (tx, requestId) => {
        await voucherLock(tx, input.value.code);
        const prior = id
          ? await tx.voucher.findUnique({ where: { id } })
          : null;
        if (id && !prior) throw new AppError("NOT_FOUND", 404);
        if (prior && prior.version !== input.version) conflict();
        if (prior && prior.code !== input.value.code)
          throw new AppError(
            "VOUCHER_CODE_LOCKED",
            409,
            "Kode tidak dapat diganti. Buat voucher baru.",
          );
        if (
          !prior &&
          (await tx.voucher.findUnique({ where: { code: input.value.code } }))
        )
          throw new AppError(
            "VOUCHER_EXISTS",
            409,
            "Kode sudah terdaftar, termasuk kode yang diarsipkan.",
          );
        if (prior?.status === "archived" && input.value.status !== "archived")
          throw new AppError("VOUCHER_ARCHIVED", 409);
        if (
          input.value.userIds.length &&
          (await tx.user.count({
            where: { id: { in: [...new Set(input.value.userIds)] } },
          })) !== new Set(input.value.userIds).size
        )
          throw new AppError("USER_NOT_FOUND", 400);
        if (prior) {
          const groups = await tx.voucherRedemption.groupBy({
            by: ["userId"],
            where: {
              voucherId: prior.id,
              status: { in: ["reserved", "consumed", "review"] },
            },
            _count: { _all: true },
          });
          if (
            groups.reduce((sum, item) => sum + item._count._all, 0) >
              input.value.maxUses ||
            groups.some((item) => item._count._all > input.value.perUserLimit)
          )
            throw new AppError(
              "VOUCHER_LIMIT_BELOW_USAGE",
              409,
              "Batas tidak boleh di bawah pemakaian dan reservasi aktif.",
            );
        }
        const value = {
          ...input.value,
          startsAt: new Date(input.value.startsAt),
          endsAt: new Date(input.value.endsAt),
          planIds: json([...new Set(input.value.planIds)]),
          userIds: json([...new Set(input.value.userIds)]),
        };
        const saved = prior
          ? await tx.voucher.update({
              where: { id },
              data: { ...value, version: { increment: 1 } },
            })
          : await tx.voucher.create({ data: value });
        await tx.voucherVersion.create({
          data: {
            voucherId: saved.id,
            version: saved.version,
            value: json(saved),
            createdBy: actor.id,
          },
        });
        await audit(
          tx,
          actor,
          prior ? "voucher.updated" : "voucher.created",
          "voucher",
          saved.id,
          input.reason,
          prior ?? undefined,
          saved,
          requestId,
        );
        return { id: saved.id };
      },
    ),
    id ? 200 : 201,
  );
}
