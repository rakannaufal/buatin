import type { NextRequest } from "next/server";
import { z } from "zod";
import { db, json } from "../db";
import { AppError } from "../errors";
import { queueEmail } from "../email";
import { getEnv } from "../config";
import { cancelJob, resumeJob } from "../projects";
import {
  controlsSchema,
  reasonSchema,
  siteSchema,
  versionSchema,
} from "../../domain/admin";
import { controls, siteSettings } from "./policies";
import {
  adminMutation,
  adminReply,
  audit,
  conflict,
  listInput,
  pageSize,
  type Operator,
} from "./security";

export async function operationsAdminApi(
  req: NextRequest,
  actor: Operator,
  segments: string[],
  body: () => Promise<unknown>,
) {
  const [, section, id, action] = segments;
  if (section === "settings") {
    if (req.method === "GET")
      return adminReply({
        site: await siteSettings(),
        history: await db.settingRevision.findMany({
          where: {
            key: {
              in:
                actor.role === "owner"
                  ? ["admin.site", "admin.controls"]
                  : ["admin.site"],
            },
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        ...(actor.role === "owner"
          ? {
              controls: {
                value: await controls(),
                version:
                  (
                    await db.setting.findUnique({
                      where: { key: "admin.controls" },
                    })
                  )?.version ?? 0,
              },
            }
          : {}),
      });
    if (req.method !== "POST") throw new AppError("METHOD_NOT_ALLOWED", 405);
    const input = z
      .object({
        version: z.number().int().min(0),
        reason: reasonSchema,
        value: z.unknown(),
      })
      .strict()
      .parse(await body());
    const isControls = id === "controls";
    if (!isControls && id !== "site") throw new AppError("NOT_FOUND", 404);
    const value = isControls
      ? controlsSchema.parse(input.value)
      : siteSchema.parse(input.value);
    if (isControls) {
      const v = controlsSchema.parse(value),
        env = getEnv();
      if (
        v.dailyRequests > env.LLM_DAILY_REQUEST_LIMIT ||
        v.userDailyRequests > env.LLM_USER_DAILY_REQUEST_LIMIT ||
        v.dailyTokens > env.LLM_DAILY_TOKEN_LIMIT ||
        v.userDailyTokens > env.LLM_USER_DAILY_TOKEN_LIMIT ||
        (env.LLM_DAILY_BUDGET_USD > 0 &&
          (v.dailyBudgetUsd <= 0 ||
            v.dailyBudgetUsd > env.LLM_DAILY_BUDGET_USD))
      )
        throw new AppError(
          "ENVIRONMENT_CEILING",
          400,
          "Batas panel tidak boleh melampaui atau menonaktifkan batas keras environment.",
        );
      if (v.dailyBudgetUsd > 0 && (!v.inputRate || !v.outputRate))
        throw new AppError(
          "LLM_PRICING_REQUIRED",
          400,
          "Isi tarif input/output sebelum mengaktifkan batas USD.",
        );
    }
    return adminReply(
      await adminMutation(
        req,
        actor,
        isControls ? "controls" : "content",
        { ...input, value },
        async (tx, requestId) => {
          const key = `admin.${id}`;
          const prior = await tx.setting.findUnique({ where: { key } });
          if ((prior?.version ?? 0) !== input.version) conflict();
          const saved = await tx.setting.upsert({
            where: { key },
            create: { key, value: json(value) },
            update: { value: json(value), version: { increment: 1 } },
          });
          await tx.settingRevision.create({
            data: {
              key,
              version: saved.version,
              value: json(value),
              createdBy: actor.id,
            },
          });
          await audit(
            tx,
            actor,
            `settings.${id}.updated`,
            "setting",
            key,
            input.reason,
            prior?.value,
            value,
            requestId,
          );
          return { ok: true };
        },
      ),
    );
  }
  if (section === "audit" && req.method === "GET") {
    const input = listInput(req);
    const where = input.q
      ? {
          OR: [
            { action: { contains: input.q } },
            { userId: input.q },
            { resourceId: input.q },
            { requestId: input.q },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      db.auditEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (input.page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditEvent.count({ where }),
    ]);
    return adminReply({ items, total, page: input.page });
  }
  if (section === "jobs") {
    if (req.method === "GET") {
      const input = listInput(req);
      const where = {
        ...(input.q ? { OR: [{ id: input.q }, { userId: input.q }] } : {}),
        ...(input.status ? { status: input.status } : {}),
      };
      const [items, total] = await Promise.all([
        db.job.findMany({
          where,
          select: {
            id: true,
            userId: true,
            status: true,
            total: true,
            done: true,
            errorCode: true,
            llmRequestCount: true,
            billingPlanId: true,
            createdAt: true,
            startedAt: true,
            finishedAt: true,
            quotaRefundedAt: true,
            leaseExpiresAt: true,
          },
          take: pageSize,
          skip: (input.page - 1) * pageSize,
          orderBy: { createdAt: "desc" },
        }),
        db.job.count({ where }),
      ]);
      return adminReply({ items, total, page: input.page });
    }
    if (id && req.method === "POST" && ["cancel", "resume"].includes(action)) {
      const input = z
        .object({ reason: reasonSchema })
        .strict()
        .parse(await body());
      return adminReply(
        await adminMutation(
          req,
          actor,
          "jobs",
          input,
          async (tx, requestId) => {
            const job = await tx.job.findUnique({
              where: { id },
              select: { userId: true, status: true },
            });
            if (!job) throw new AppError("NOT_FOUND", 404);
            const result =
              action === "cancel"
                ? await cancelJob(job.userId, id, tx)
                : await resumeJob(job.userId, id, `admin:${requestId}`, tx);
            await audit(
              tx,
              actor,
              `job.${action}`,
              "job",
              id,
              input.reason,
              { status: job.status },
              result,
              requestId,
            );
            return result;
          },
        ),
      );
    }
  }
  if (section === "privacy") {
    if (req.method === "GET") {
      const input = listInput(req);
      const where = {
        ...(input.status ? { status: input.status } : {}),
        ...(input.q ? { userId: input.q } : {}),
      };
      const [items, total] = await Promise.all([
        db.dataRequest.findMany({
          where,
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "asc" },
          take: pageSize,
          skip: (input.page - 1) * pageSize,
        }),
        db.dataRequest.count({ where }),
      ]);
      return adminReply({ items, total, page: input.page });
    }
    if (id && req.method === "POST") {
      const input = z
        .object({
          version: versionSchema,
          status: z.enum(["processing", "completed", "rejected"]),
          evidence: z.string().trim().max(1000),
          reason: reasonSchema,
        })
        .strict()
        .parse(await body());
      return adminReply(
        await adminMutation(
          req,
          actor,
          "privacy",
          input,
          async (tx, requestId) => {
            const prior = await tx.dataRequest.findUnique({
              where: { id },
              include: { user: { select: { email: true } } },
            });
            if (!prior) throw new AppError("NOT_FOUND", 404);
            if (
              prior.version !== input.version ||
              !["open", "processing"].includes(prior.status)
            )
              conflict();
            if (
              input.status === "completed" &&
              (prior.status !== "processing" || input.evidence.length < 12)
            )
              throw new AppError(
                "FULFILLMENT_REQUIRED",
                400,
                "Proses permintaan lebih dahulu, lalu sertakan referensi bukti pemenuhan; jangan masukkan data pribadi atau secret.",
              );
            await tx.dataRequest.update({
              where: { id },
              data: {
                status: input.status,
                assignedTo: actor.id,
                note: input.reason,
                evidence: input.evidence,
                version: { increment: 1 },
              },
            });
            if (prior.user && input.status !== "processing")
              await queueEmail(
                prior.user.email,
                "Pembaruan permintaan data Buatin",
                `Permintaan ${id}: ${input.status}.\n${input.reason}\nHubungi bantuan untuk rincian.`,
                `privacy:${id}:${input.status}`,
                tx,
              );
            await audit(
              tx,
              actor,
              "privacy.updated",
              "data-request",
              id,
              input.reason,
              { status: prior.status },
              { status: input.status, evidence: input.evidence },
              requestId,
            );
            return { ok: true };
          },
        ),
      );
    }
  }
  return null;
}
