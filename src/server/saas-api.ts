import { NextRequest } from "next/server";
import { z } from "zod";
import { preferencesSchema, readPreferences } from "../domain/preferences";
import { referenceMetadataSchema } from "../domain/references";
import QRCode from "qrcode";
import { db, json } from "./db";
import { AppError } from "./errors";
import { entitlementFor, requireFeature, closeFailedJob } from "./entitlements";
import { billingPlans, checkout } from "./billing";
import { billingQuote } from "./vouchers";
import { paymentConfigured } from "./duitku";
import { getEnv } from "./config";
import { publicAuthReady } from "./challenge";
import { userLock, rateLimit } from "./limits";
import {
  projectFor,
  saveProject,
  jobFor,
  regenerateJob,
  startBatch,
} from "./projects";
import { catalog } from "../domain/catalog";
import { PLAN_IDS, regenerationClosure } from "../domain/billing";
import { hasBinaryCharacters } from "../domain/text";
import type { Snapshot } from "../domain/types";
import { runtimeSecrets } from "../worker/generator";
import { productionChecks, operationsSnapshot } from "./operations";

export const adminRole = (role: string) => role === "owner" || role === "admin";
const reply = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
const keyFor = (req: NextRequest) =>
  z.string().min(8).max(128).parse(req.headers.get("idempotency-key"));
const webType = z.enum([
  "landing",
  "company",
  "portfolio",
  "blog",
  "ecommerce",
  "saas",
  "internal",
  "booking",
  "custom",
]);
type User = { id: string; email: string; name: string; role: string };
export async function saasApi(
  req: NextRequest,
  user: User,
  segments: string[],
  body: () => Promise<unknown>,
): Promise<Response | null> {
  const [resource, id, action] = segments,
    method = req.method;
  if (resource === "account") {
    if (method === "GET")
      return reply({
        entitlement: await entitlementFor(user.id),
        user: await db.user.findUnique({
          where: { id: user.id },
          select: {
            name: true,
            email: true,
            emailVerified: true,
            renewalReminders: true,
            twoFactorEnabled: true,
          },
        }),
      });
    if (method === "PATCH") {
      const input = z
        .object({
          name: z.string().trim().min(1).max(100).optional(),
          renewalReminders: z.boolean().optional(),
        })
        .parse(await body());
      await db.user.update({ where: { id: user.id }, data: input });
      return reply({ ok: true });
    }
  }
  if (resource === "billing") {
    if (!id && method === "GET") {
      const [plans, entitlement, payments, subscriptions] = await Promise.all([
        billingPlans(),
        entitlementFor(user.id),
        db.payment.findMany({
          where: { userId: user.id },
          take: 30,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            planName: true,
            amount: true,
            status: true,
            createdAt: true,
            paidAt: true,
            expiresAt: true,
          },
        }),
        db.subscription.findMany({
          where: {
            userId: user.id,
            revokedAt: null,
            endsAt: { gt: new Date() },
          },
          orderBy: { startsAt: "asc" },
          include: { plan: { select: { name: true } } },
        }),
      ]);
      return reply({
        plans,
        entitlement,
        payments,
        subscriptions: subscriptions.map((period) => ({
          ...period,
          plan: { name: period.planName ?? period.plan.name },
        })),
        paymentReady: paymentConfigured(),
        sandbox: getEnv().DUITKU_ENV === "sandbox",
      });
    }
    if (id === "checkout" && method === "POST") {
      const input = z
        .object({ planId: z.enum(PLAN_IDS), quote: z.unknown().optional() })
        .strict()
        .parse(await body());
      return reply(
        {
          payment: await checkout(user, input.planId, keyFor(req), input.quote),
        },
        201,
      );
    }
    if (id === "quote" && method === "POST") {
      await rateLimit(`voucher-quote:${user.id}`, 20, 300);
      const input = z
        .object({
          planId: z.enum(PLAN_IDS),
          code: z.string().max(32).default(""),
        })
        .strict()
        .parse(await body());
      return reply({
        quote: await billingQuote(user.id, input.planId, input.code),
      });
    }
    if (id && method === "GET") {
      await rateLimit(`billing-read:${user.id}`, 60, 60);
      const payment = await db.payment.findFirst({
        where: { id, userId: user.id },
        include: { subscription: true },
      });
      if (!payment) throw new AppError("NOT_FOUND", 404);
      const qr =
        payment.qrString &&
        payment.expiresAt.getTime() > Date.now() &&
        payment.status === "pending"
          ? await QRCode.toDataURL(payment.qrString, {
              width: 360,
              margin: 4,
              errorCorrectionLevel: "M",
            })
          : null;
      return reply({
        payment: {
          id,
          amount: payment.amount,
          subtotal: payment.subtotal,
          discount: payment.discount,
          voucherCode:
            (payment.voucherSnapshot as { code?: string } | null)?.code ?? null,
          planName: payment.planName,
          status: payment.status,
          expiresAt: payment.expiresAt,
          paidAt: payment.paidAt,
          createdAt: payment.createdAt,
          reference: payment.reference,
          subscription: payment.subscription,
          qr,
          errorCode: payment.errorCode,
        },
        sandbox: getEnv().DUITKU_ENV === "sandbox",
      });
    }
  }
  if (resource === "presets") {
    await requireFeature(user.id, "presets");
    if (method === "GET")
      return reply({
        presets: await db.briefPreset.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          take: 50,
        }),
      });
    if (!id && method === "POST") {
      const input = z
        .object({
          name: z.string().trim().min(1).max(100),
          webType,
          brief: z.string().trim().min(20).max(getEnv().MAX_BRIEF_CHARS),
          preferences: preferencesSchema,
        })
        .parse(await body());
      const preset = await db.$transaction(async (tx) => {
        await userLock(tx, user.id);
        await requireFeature(user.id, "presets", tx);
        if ((await tx.briefPreset.count({ where: { userId: user.id } })) >= 50)
          throw new AppError(
            "PRESET_LIMIT",
            409,
            "Maksimal 50 preset pribadi.",
          );
        return tx.briefPreset.create({
          data: {
            ...input,
            preferences: json(input.preferences),
            userId: user.id,
          },
        });
      });
      return reply({ preset }, 201);
    }
    if (id && method === "DELETE") {
      if (
        !(await db.briefPreset.deleteMany({ where: { id, userId: user.id } }))
          .count
      )
        throw new AppError("NOT_FOUND", 404);
      return reply({ ok: true });
    }
  }
  if (resource === "templates") {
    await requireFeature(user.id, "templates");
    if (method === "GET")
      return reply({
        templates: await db.documentTemplate.findMany({
          where: { userId: user.id },
        }),
      });
    if (id && method === "PUT") {
      const input = z
        .object({ content: z.string().trim().min(10).max(32000) })
        .parse(await body());
      if (
        !catalog.some((entry) => entry.id === id) ||
        hasBinaryCharacters(input.content) ||
        runtimeSecrets().some((secret) => input.content.includes(secret))
      )
        throw new AppError(
          "INVALID_TEMPLATE",
          400,
          "Gunakan Markdown tanpa data biner atau kunci server.",
        );
      return reply({
        template: await db.documentTemplate.upsert({
          where: { userId_fileId: { userId: user.id, fileId: id } },
          create: { userId: user.id, fileId: id, content: input.content },
          update: { content: input.content },
        }),
      });
    }
    if (id && method === "DELETE") {
      await db.documentTemplate.deleteMany({
        where: { userId: user.id, fileId: id },
      });
      return reply({ ok: true });
    }
  }
  if (resource === "projects" && id && action === "revisions") {
    await requireFeature(user.id, "revisions");
    const project = await projectFor(user.id, id);
    if (method === "GET")
      return reply({
        revisions: await db.projectRevision.findMany({
          where: { projectId: id },
          orderBy: { version: "desc" },
          take: 100,
        }),
        current: {
          name: project.name,
          brief: project.brief,
          webType: project.webType,
          version: project.briefVersion,
          preferences: readPreferences(project.preferences),
          attachmentIds: project.attachments.map((attachment) => attachment.id),
        },
      });
    if (method === "POST") {
      const input = z
        .object({
          revisionId: z.string().min(1),
          briefVersion: z.number().int().positive(),
        })
        .parse(await body());
      const revision = await db.projectRevision.findFirst({
        where: { id: input.revisionId, projectId: id },
      });
      if (!revision) throw new AppError("NOT_FOUND", 404);
      return reply({
        project: await saveProject(
          user.id,
          id,
          {
            name: revision.name,
            brief: revision.brief,
            webType: webType.parse(revision.webType),
            briefVersion: input.briefVersion,
            preferences: readPreferences(revision.preferences),
            attachmentIds: z.array(z.string()).parse(revision.attachmentIds),
          },
          async (tx) => {
            const state = z
              .array(
                referenceMetadataSchema.extend({
                  id: z.string(),
                  text: z.string().max(12000).optional(),
                }),
              )
              .parse(revision.attachmentState);
            for (const { id: attachmentId, ...metadata } of state)
              await tx.projectAttachment.updateMany({
                where: { id: attachmentId, projectId: id, included: true },
                data: metadata,
              });
          },
        ),
      });
    }
  }
  if (
    resource === "projects" &&
    id &&
    action === "history" &&
    method === "GET"
  ) {
    await requireFeature(user.id, "revisions");
    await projectFor(user.id, id);
    return reply({
      jobs: await db.job.findMany({
        where: {
          projectId: id,
          userId: user.id,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          status: true,
          createdAt: true,
          done: true,
          total: true,
        },
      }),
    });
  }
  if (resource === "batch" && method === "POST") {
    const input = z
      .object({
        items: z
          .array(
            z.object({
              projectId: z.string().min(1),
              planVersion: z.number().int().positive(),
            }),
          )
          .min(1)
          .max(10),
      })
      .parse(await body());
    return reply(await startBatch(user.id, input.items, keyFor(req)), 202);
  }
  if (resource === "batch-ready" && method === "GET") {
    await requireFeature(user.id, "batch");
    return reply({
      projects: await db.project.findMany({
        where: { userId: user.id, status: "plan_ready" },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: {
          id: true,
          name: true,
          plans: {
            orderBy: { version: "desc" },
            take: 1,
            select: { version: true },
          },
        },
      }),
    });
  }
  if (resource === "jobs" && id && action === "close" && method === "POST")
    return reply({ job: await closeFailedJob(user.id, id) });
  if (resource === "jobs" && id && action === "regenerate") {
    await requireFeature(user.id, "regeneration");
    const input = z
      .object({ fileIds: z.array(z.string().min(1).max(60)).min(1).max(42) })
      .parse(await body());
    if (method === "POST")
      return reply(
        { job: await regenerateJob(user.id, id, input.fileIds, keyFor(req)) },
        202,
      );
    if (method === "PUT") {
      const source = await jobFor(user.id, id),
        snapshot = source.snapshot as unknown as Snapshot;
      if (
        !["succeeded", "partial"].includes(source.status) ||
        source.quotaRefundedAt
      )
        throw new AppError("RESULT_NOT_READY", 409);
      let impacted: string[];
      try {
        impacted = regenerationClosure(
          [
            ...input.fileIds,
            ...source.files
              .filter((file) => file.status !== "succeeded")
              .map((file) => file.fileId),
          ],
          snapshot.plan.selected.map((file) => file.id),
          snapshot.catalog,
        );
      } catch {
        throw new AppError(
          "INVALID_SELECTION",
          400,
          "Pilih dokumen dalam paket ini.",
        );
      }
      return reply({ impacted });
    }
  }
  if (resource === "jobs" && id && action === "compare" && method === "GET") {
    await requireFeature(user.id, "revisions");
    const otherId = z
      .string()
      .min(1)
      .parse(req.nextUrl.searchParams.get("with"));
    const [left, right] = await Promise.all([
      jobFor(user.id, otherId),
      jobFor(user.id, id),
    ]);
    if (left.projectId !== right.projectId)
      throw new AppError("INVALID_COMPARISON", 400);
    const fileId = req.nextUrl.searchParams.get("file") ?? "prd";
    return reply({
      left: {
        id: left.id,
        content:
          left.files.find(
            (file) => file.fileId === fileId && file.status === "succeeded",
          )?.content ?? "",
      },
      right: {
        id: right.id,
        content:
          right.files.find(
            (file) => file.fileId === fileId && file.status === "succeeded",
          )?.content ?? "",
      },
    });
  }
  if (resource === "admin") {
    if (!adminRole(user.role)) throw new AppError("FORBIDDEN", 403);
    if (id === "operations" && method === "GET") {
      const [checks, runtime, dataRequests] = await Promise.all([
        productionChecks(),
        operationsSnapshot(),
        db.dataRequest.findMany({
          where: { status: { in: ["open", "processing"] } },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "asc" },
          take: 30,
        }),
      ]);
      return reply({ checks, runtime, dataRequests });
    }
    if (id === "data-requests" && action && method === "PATCH") {
      const input = z
        .object({ status: z.enum(["processing", "completed", "rejected"]) })
        .parse(await body());
      await db.$transaction(async (tx) => {
        const changed = await tx.dataRequest.updateMany({
          where: { id: action, status: { in: ["open", "processing"] } },
          data: input,
        });
        if (!changed.count)
          throw new AppError(
            "REQUEST_ALREADY_CLOSED",
            409,
            "Permintaan tidak tersedia atau sudah selesai. Muat ulang daftar.",
          );
        await tx.auditEvent.create({
          data: {
            userId: user.id,
            action: `privacy.request.${input.status}`,
            resourceId: action,
          },
        });
      });
      return reply({ ok: true });
    }
    if (!id && method === "GET") {
      const page = Math.max(
        1,
        Math.min(10000, Number(req.nextUrl.searchParams.get("page")) || 1),
      );
      const [
        users,
        totalUsers,
        payments,
        jobs,
        usage,
        plans,
        worker,
        emailFailures,
        unresolvedPayments,
      ] = await Promise.all([
        db.user.findMany({
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * 20,
          take: 20,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            emailVerified: true,
            createdAt: true,
            subscriptions: {
              where: {
                revokedAt: null,
                startsAt: { lte: new Date() },
                endsAt: { gt: new Date() },
              },
              select: { planId: true, endsAt: true },
            },
          },
        }),
        db.user.count(),
        db.payment.findMany({
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            userId: true,
            planName: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        }),
        db.job.findMany({
          orderBy: { createdAt: "desc" },
          take: 30,
          select: {
            id: true,
            userId: true,
            status: true,
            total: true,
            done: true,
            llmRequestCount: true,
            billingPlanId: true,
            createdAt: true,
            expiresAt: true,
          },
        }),
        db.aiUsage.aggregate({
          _sum: { tokensIn: true, tokensOut: true },
          _count: { _all: true },
        }),
        billingPlans(),
        db.setting.findUnique({ where: { key: "worker" } }),
        db.emailMessage.count({
          where: { sentAt: null, attempts: { gte: 8 } },
        }),
        db.payment.count({
          where: {
            status: { in: ["creating", "pending", "review"] },
            checks: { gte: 12 },
          },
        }),
      ]);
      return reply({
        users,
        totalUsers,
        page,
        payments,
        jobs,
        usage: { ...usage._sum, attempts: usage._count._all },
        plans,
        readiness: {
          worker: Boolean(
            worker && Date.now() - worker.updatedAt.getTime() < 30000,
          ),
          publicAuth: publicAuthReady(),
          payment: paymentConfigured(),
          sandbox: getEnv().DUITKU_ENV === "sandbox",
          mock: getEnv().MOCK_LLM === "true",
          emailFailures,
          unresolvedPayments,
        },
      });
    }
    if (id === "plans" && action && method === "PATCH") {
      const planId = z.enum(["starter", "plus", "max"]).parse(action);
      const input = z
        .object({
          monthlyPrice: z.number().int().min(1000).max(100000000).nullable(),
          available: z.boolean(),
          weeklyQuota: z.number().int().min(1).max(100),
          retentionDays: z.number().int().min(1).max(365),
        })
        .parse(await body());
      if (input.available && !input.monthlyPrice)
        throw new AppError(
          "PRICE_REQUIRED",
          400,
          "Isi harga sebelum mengaktifkan paket.",
        );
      await db.$transaction([
        db.billingPlan.update({ where: { id: planId }, data: input }),
        db.auditEvent.create({
          data: {
            userId: user.id,
            action: "billing.plan.updated",
            resourceId: planId,
          },
        }),
      ]);
      return reply({ ok: true });
    }
    if (id === "payments" && action && method === "POST") {
      await rateLimit(`admin-reconcile:${user.id}`, 5, 300);
      const payment = await db.payment.findUnique({ where: { id: action } });
      if (!payment) throw new AppError("NOT_FOUND", 404);
      if (
        payment.status !== "paid" &&
        (!payment.lastCheckedAt ||
          Date.now() - payment.lastCheckedAt.getTime() > 60000)
      )
        await db.payment.update({
          where: { id: action },
          data: { checks: 0, lastCheckedAt: null, status: "review" },
        });
      await db.auditEvent.create({
        data: {
          userId: user.id,
          action: "payment.reconcile.requested",
          resourceId: action,
        },
      });
      return reply({ ok: true }, 202);
    }
  }
  return null;
}
