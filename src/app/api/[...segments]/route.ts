import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db, json } from "@/server/db";
import { getEnv } from "@/server/config";
import { entitlementFor } from "@/server/entitlements";
import { saasApi, adminRole } from "@/server/saas-api";
import { billingPlans } from "@/server/billing";
import { paymentConfigured } from "@/server/duitku";
import { publicAuthReady, localApp } from "@/server/challenge";
import { AppError } from "@/server/errors";
import { userLock, rateLimit } from "@/server/limits";
import {
  projectFor,
  saveProject,
  queuePlan,
  changePlan,
  startJob,
  jobFor,
  cancelJob,
  resumeJob,
} from "@/server/projects";
import { llmConfig, checkModels } from "@/server/llm";
import { download } from "@/server/download";
import { hasBinaryCharacters } from "@/domain/text";
import { ACTIVE_STATUSES, type Snapshot } from "@/domain/types";
import {
  preferencesSchema,
  preferenceConflicts,
  readPreferences,
} from "@/domain/preferences";
import { projectContext } from "@/domain/project-context";
import { skillSelectionIssues } from "@/domain/skills";
import { customizationApi } from "@/server/references-api";
import { cleanupReferenceStorage } from "@/server/reference-storage";
import { readiness } from "@/server/health";
import { checkOperatorMfa } from "@/server/operator-access";
import { accountApi } from "@/server/account-api";
import { adminApi, acceptInvitation } from "@/server/admin/api";
import { activeUser, adminMutation, audit } from "@/server/admin/security";
import { siteSettings } from "@/server/admin/policies";
import { reasonSchema } from "@/domain/admin";
import { supportApi } from "@/server/admin/support";
import { googleAuthReady } from "@/server/google-auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const typeSchema = z.enum([
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
async function body(req: NextRequest): Promise<unknown> {
  if (!req.body) return {};
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > getEnv().MAX_BRIEF_UPLOAD_BYTES * 2) {
      await reader.cancel();
      throw new AppError("BODY_TOO_LARGE", 413, "Permintaan terlalu besar.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)),
    );
  } catch {
    throw new AppError("INVALID_JSON", 400, "Isi permintaan tidak valid.");
  }
}
const reply = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
async function handler(
  req: NextRequest,
  context: { params: Promise<{ segments: string[] }> },
) {
  const requestId = crypto.randomUUID();
  try {
    const { segments } = await context.params;
    const [resource, id, action, subId, last] = segments;
    const method = req.method;
    if (resource === "health" && method === "GET" && !action) {
      if (id === "live") return reply({ ok: true });
      if (!id || id === "ready") {
        const status = await readiness();
        return reply({ ok: status.ok }, status.ok ? 200 : 503);
      }
    }
    if (resource === "pricing" && method === "GET")
      return reply({
        plans: await billingPlans(),
        paymentReady: paymentConfigured(),
      });
    if (resource === "public-config" && method === "GET")
      return reply({
        mock: getEnv().MOCK_LLM === "true",
        turnstileSiteKey: getEnv().TURNSTILE_SITE_KEY,
        registrationReady: publicAuthReady(),
        googleReady: googleAuthReady(),
        localEmail: localApp() && getEnv().EMAIL_PROVIDER === "local",
      });
    if (resource === "site" && method === "GET")
      return reply((await siteSettings()).value);
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session)
      throw new AppError("UNAUTHENTICATED", 401, "Silakan masuk kembali.");
    const user = await activeUser(session.user.id);
    if (!user.emailVerified)
      throw new AppError(
        "EMAIL_UNVERIFIED",
        403,
        "Verifikasi email sebelum memakai workspace.",
      );
    if (
      !["GET", "HEAD"].includes(method) &&
      req.headers.get("origin") !== getEnv().APP_URL
    )
      throw new AppError(
        "INVALID_ORIGIN",
        403,
        "Origin permintaan tidak diizinkan.",
      );
    await rateLimit(`api:${user.id}`, 300, 60);
    if (["admin", "settings"].includes(resource) && adminRole(user.role))
      checkOperatorMfa(user);
    const actor = {
      id: user.id,
      role: user.role,
      sessionId: session.session.id,
      twoFactorEnabled: user.twoFactorEnabled,
      requestId,
    };
    if (resource === "admin") {
      const response = await adminApi(req, actor, segments, () => body(req));
      if (response) return response;
    }
    if (resource === "support") {
      const response = await supportApi(req, user.id, segments, () =>
        body(req),
      );
      if (response) return response;
    }
    if (
      resource === "account" &&
      id === "invitations" &&
      action === "accept" &&
      method === "POST"
    )
      return reply(await acceptInvitation(user, await body(req)));
    const account = await accountApi(req, session, segments, () => body(req));
    if (account) return account;
    const customization = await customizationApi(req, user, segments, () =>
      body(req),
    );
    if (customization) return customization;
    if (resource === "session" && method === "GET")
      return reply({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        mock: getEnv().MOCK_LLM === "true",
      });
    const saas = await saasApi(req, user, segments, () => body(req));
    if (saas) return saas;
    if (resource === "projects" && !id) {
      if (method === "GET") {
        const page = Math.max(
          1,
          Math.min(Number(req.nextUrl.searchParams.get("page")) || 1, 10000),
        );
        const [projects, total, usage, worker] = await Promise.all([
          db.project.findMany({
            where: { userId: user.id },
            orderBy: { updatedAt: "desc" },
            skip: (page - 1) * 20,
            take: 20,
            include: {
              jobs: {
                take: 1,
                orderBy: { createdAt: "desc" },
                select: { id: true, status: true, total: true, done: true },
              },
            },
          }),
          db.project.count({ where: { userId: user.id } }),
          entitlementFor(user.id),
          db.setting.findUnique({ where: { key: "worker" } }),
        ]);
        return reply({
          projects: projects.map(({ brief, clarification, ...project }) => ({
            ...project,
            briefPreview: brief.slice(0, 180),
            hasClarification: Boolean(clarification),
          })),
          total,
          page,
          usage: usage.used,
          limit: usage.limit,
          entitlement: usage,
          mock: getEnv().MOCK_LLM === "true",
          workerReady: Boolean(
            worker && Date.now() - worker.updatedAt.getTime() < 30000,
          ),
        });
      }
      if (method === "POST") {
        await rateLimit(`project:${user.id}`, 30, 3600);
        const input = z
          .object({
            webType: typeSchema,
            name: z.string().trim().max(160).optional(),
            brief: z.string().max(getEnv().MAX_BRIEF_CHARS).default(""),
            preferences: preferencesSchema,
          })
          .parse(await body(req));
        const conflicts = [
          ...preferenceConflicts(input.preferences, input.webType),
          ...skillSelectionIssues(input.preferences),
        ];
        if (conflicts.length)
          throw new AppError("PREFERENCE_CONFLICT", 400, conflicts.join(" "));
        const project = await db.project.create({
          data: {
            userId: user.id,
            webType: input.webType,
            name: input.name || "Proyek tanpa judul",
            brief: input.brief,
            preferences: json(input.preferences),
            expiresAt: new Date(
              Date.now() + getEnv().DRAFT_TTL_HOURS * 3600000,
            ),
          },
        });
        return reply({ project }, 201);
      }
    }
    if (resource === "projects" && id) {
      if (!action && method === "GET") {
        const project = await projectFor(user.id, id);
        return reply({
          project: {
            ...project,
            preferences: readPreferences(project.preferences),
            customization: projectContext(
              project.preferences,
              typeSchema.parse(project.webType),
              project.attachments.filter(
                (reference) => reference.status === "ready",
              ),
            ),
            plans: project.plans.map((p) => ({
              id: p.id,
              version: p.version,
              briefVersion: p.briefVersion,
              data: p.data,
            })),
            tasks: project.tasks.map((t) => ({
              id: t.id,
              status: t.status,
              errorCode: t.errorCode,
            })),
          },
        });
      }
      if (!action && method === "PATCH") {
        const input = z
          .object({
            name: z.string().trim().min(1).max(160).optional(),
            webType: typeSchema.optional(),
            brief: z.string().max(getEnv().MAX_BRIEF_CHARS).optional(),
            preferences: preferencesSchema.optional(),
            briefVersion: z.number().int().positive(),
          })
          .parse(await body(req));
        return reply({ project: await saveProject(user.id, id, input) });
      }
      if (!action && method === "DELETE") {
        await db.$transaction(async (tx) => {
          await userLock(tx, user.id);
          const project = await tx.project.findFirst({
            where: { id, userId: user.id },
            include: {
              jobs: { select: { id: true, status: true } },
              tasks: { select: { id: true, status: true } },
              attachments: { select: { id: true } },
            },
          });
          if (!project) throw new AppError("NOT_FOUND", 404);
          if (
            project.jobs.some((j) => ACTIVE_STATUSES.includes(j.status)) ||
            project.tasks.some((t) => ["queued", "running"].includes(t.status))
          )
            throw new AppError(
              "PROCESS_ACTIVE",
              409,
              "Batalkan atau tunggu proses aktif sebelum menghapus proyek.",
            );
          const ids = [
            ...project.jobs.map((j) => j.id),
            ...project.tasks.map((t) => t.id),
            ...project.attachments.map((reference) => reference.id),
          ];
          await tx.outboxEvent.deleteMany({
            where: { resourceId: { in: ids } },
          });
          await tx.job.deleteMany({ where: { projectId: id } });
          await tx.plan.deleteMany({ where: { projectId: id } });
          await tx.planningTask.deleteMany({ where: { projectId: id } });
          await tx.project.delete({ where: { id } });
        });
        await cleanupReferenceStorage();
        return reply({ ok: true });
      }
      if (action === "plans" && method === "POST") {
        const input = z
          .object({ briefVersion: z.number().int().positive() })
          .parse(await body(req));
        return reply(
          { task: await queuePlan(user.id, id, input.briefVersion) },
          202,
        );
      }
      if (action === "plan" && method === "GET") {
        const project = await projectFor(user.id, id);
        return reply({
          plan: project.plans[0]
            ? { version: project.plans[0].version, data: project.plans[0].data }
            : null,
          status: project.status,
        });
      }
      if (action === "plan" && method === "PATCH") {
        const input = z
          .object({
            version: z.number().int().positive(),
            fileId: z.string().min(1).max(60),
            include: z.boolean(),
          })
          .parse(await body(req));
        const plan = await changePlan(
          user.id,
          id,
          input.version,
          input.fileId,
          input.include,
        );
        return reply({ plan: { version: plan.version, data: plan.data } });
      }
      if (action === "clarification" && method === "POST") {
        const input = z
          .object({
            briefVersion: z.number().int().positive(),
            answers: z.array(z.string().max(1000)).max(5),
          })
          .parse(await body(req));
        const project = await db.$transaction(async (tx) => {
          await userLock(tx, user.id);
          const project = await tx.project.findFirst({
            where: { id, userId: user.id },
          });
          if (!project) throw new AppError("NOT_FOUND", 404);
          if (
            project.clarified ||
            project.status !== "needs_clarification" ||
            input.briefVersion !== project.briefVersion
          )
            throw new AppError("CLARIFICATION_STALE", 409);
          const brief =
            project.brief +
            (input.answers.some((a) => a.trim())
              ? `\n\nJawaban klarifikasi:\n${input.answers.map((a, i) => `${i + 1}. ${a.trim() || "Belum ditentukan"}`).join("\n")}`
              : "");
          if (brief.length > getEnv().MAX_BRIEF_CHARS)
            throw new AppError(
              "BRIEF_TOO_LONG",
              413,
              "Brief dan klarifikasi melewati batas karakter.",
            );
          return tx.project.update({
            where: { id },
            data: {
              brief,
              briefVersion: { increment: 1 },
              clarified: true,
              clarification: json(input.answers),
              status: "draft",
            },
          });
        });
        return reply({ project });
      }
      if (action === "imports" && method === "POST") {
        const input = z
          .object({
            name: z.string().regex(/\.(?:txt|md)$/i),
            content: z.string(),
            briefVersion: z.number().int().positive(),
            mode: z.enum(["append", "replace"]),
          })
          .parse(await body(req));
        if (
          Buffer.byteLength(input.content) > getEnv().MAX_BRIEF_UPLOAD_BYTES ||
          hasBinaryCharacters(input.content)
        )
          throw new AppError(
            "INVALID_FILE",
            413,
            "Hanya teks UTF-8 dalam batas ukuran yang diterima.",
          );
        const current = await projectFor(user.id, id);
        const brief =
          input.mode === "append"
            ? `${current.brief}\n\n${input.content}`.trim()
            : input.content;
        if (brief.length > getEnv().MAX_BRIEF_CHARS)
          throw new AppError(
            "BRIEF_TOO_LONG",
            413,
            "Brief melewati batas karakter.",
          );
        return reply({
          project: await saveProject(user.id, id, {
            brief,
            briefVersion: input.briefVersion,
          }),
        });
      }
      if (action === "jobs" && method === "POST") {
        const input = z
          .object({ planVersion: z.number().int().positive() })
          .parse(await body(req));
        const key = z
          .string()
          .min(8)
          .max(128)
          .parse(req.headers.get("idempotency-key"));
        return reply(
          { job: await startJob(user.id, id, input.planVersion, key) },
          202,
        );
      }
    }
    if (resource === "planning-tasks" && id && method === "GET") {
      const task = await db.planningTask.findFirst({
        where: { id, project: { userId: user.id } },
        select: { id: true, status: true, errorCode: true },
      });
      if (!task) throw new AppError("NOT_FOUND", 404);
      return reply({ task });
    }
    if (resource === "jobs" && id) {
      if (action === "cancel" && method === "POST")
        return reply({ job: await cancelJob(user.id, id) }, 202);
      if (action === "resume" && method === "POST") {
        const key = z
          .string()
          .min(8)
          .max(128)
          .parse(req.headers.get("idempotency-key"));
        return reply({ job: await resumeJob(user.id, id, key) }, 202);
      }
      if (action === "download" && method === "GET")
        return await download(user.id, id);
      if (
        action === "files" &&
        subId &&
        last === "download" &&
        method === "GET"
      )
        return await download(user.id, id, subId);
      const job = await jobFor(user.id, id);
      const snapshot = job.snapshot as unknown as Snapshot;
      if (action === "files" && subId && method === "GET") {
        const file = job.files.find((f) => f.fileId === subId);
        if (!file || file.status !== "succeeded")
          throw new AppError("NOT_FOUND", 404);
        return reply({
          file: {
            ...file,
            path: snapshot.catalog.find((c) => c.id === subId)?.path,
          },
        });
      }
      if ((!action || action === "files") && method === "GET")
        return reply({
          job: {
            id: job.id,
            project: job.project,
            status: job.status,
            total: job.total,
            done: job.done,
            failed: job.failed,
            llmRequestCount: job.llmRequestCount,
            errorCode: job.errorCode,
            lint: job.lint,
            manifest: job.manifest,
            createdAt: job.createdAt,
            startedAt: job.startedAt,
            finishedAt: job.finishedAt,
            heartbeatAt: job.heartbeatAt,
            expiresAt: job.expiresAt,
            billingPlanId: job.billingPlanId,
            quotaRefundedAt: job.quotaRefundedAt,
            sourceJobId: job.sourceJobId,
            mock: snapshot.config.mock,
            plan: snapshot.plan,
            files: snapshot.plan.selected.map((selected) => {
              const file = job.files.find((f) => f.fileId === selected.id)!;
              return {
                id: selected.id,
                path: selected.path,
                status: file.status,
                attempts: file.attempts,
                modelUsed: file.modelUsed,
                tokensIn: file.tokensIn,
                tokensOut: file.tokensOut,
                lint: file.lint,
                errorCode: file.errorCode,
              };
            }),
          },
        });
    }
    if (resource === "settings") {
      if (!adminRole(user.role)) throw new AppError("FORBIDDEN", 403);
      if (action === undefined && id === "llm-check" && method === "POST") {
        await rateLimit(`check:${user.id}`, 10, 60);
        const config = await llmConfig();
        return reply({
          models: await checkModels(config, false),
          mock: config.mock,
        });
      }
      if (!id && method === "GET") {
        const config = await llmConfig();
        const worker = await db.setting.findUnique({
          where: { key: "worker" },
        });
        const models = await db.setting.findUnique({
          where: { key: "models" },
          select: { version: true },
        });
        return reply({
          mock: config.mock,
          version: models?.version ?? 0,
          planner: config.planner,
          writer: config.writer,
          workerReady: Boolean(
            worker && Date.now() - worker.updatedAt.getTime() < 30000,
          ),
          workerAt: worker?.updatedAt,
          limits: {
            brief: getEnv().MAX_BRIEF_CHARS,
            documents: getEnv().MAX_DOC_FILES,
            concurrency: getEnv().WORKER_CONCURRENCY,
          },
        });
      }
      if (!id && method === "PATCH") {
        const input = z
          .object({
            planner: z.string().min(1).max(160),
            writer: z.string().min(1).max(160),
            version: z.number().int().min(0),
            reason: reasonSchema,
          })
          .strict()
          .parse(await body(req));
        const config = await llmConfig();
        if (config.mock)
          throw new AppError(
            "MOCK_SETTINGS",
            409,
            "Nonaktifkan mode mock melalui environment server untuk memilih model nyata.",
          );
        await checkModels({ ...config, ...input });
        return reply(
          await adminMutation(
            req,
            actor,
            "jobs",
            input,
            async (tx, requestId) => {
              const prior = await tx.setting.findUnique({
                where: { key: "models" },
              });
              if ((prior?.version ?? 0) !== input.version)
                throw new AppError(
                  "VERSION_CONFLICT",
                  409,
                  "Pilihan model berubah. Muat ulang sebelum menyimpan.",
                );
              const value = { planner: input.planner, writer: input.writer };
              await tx.setting.upsert({
                where: { key: "models" },
                create: { key: "models", value: json(value) },
                update: { value: json(value), version: { increment: 1 } },
              });
              await audit(
                tx,
                actor,
                "ai.models.updated",
                "setting",
                "models",
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
    }
    throw new AppError("NOT_FOUND", 404, "Halaman API tidak ditemukan.");
  } catch (error) {
    if (error instanceof z.ZodError)
      return reply(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Periksa isian dan batas ukuran data.",
            requestId,
          },
        },
        400,
      );
    if (error instanceof AppError) {
      if (
        error.status === 403 &&
        req.nextUrl.pathname.startsWith("/api/admin/")
      ) {
        try {
          await rateLimit("security-log:admin-denied", 10, 60);
          console.warn(
            JSON.stringify({
              event: "admin.request.denied",
              requestId,
              code: error.code,
            }),
          );
        } catch (loggingError) {
          // Expected limiter rejection suppresses floods without changing authorization.
          if (!(
            loggingError instanceof AppError &&
            loggingError.code === "RATE_LIMITED"
          ))
            console.error(
              JSON.stringify({ event: "security.logging.failed", requestId }),
            );
        }
      }
      return reply(
        {
          error: { code: error.code, message: error.publicMessage, requestId },
        },
        error.status,
      );
    }
    const code =
      error instanceof Error && "code" in error
        ? String(error.code)
        : "INTERNAL_ERROR";
    console.error(JSON.stringify({ event: "request.failed", requestId, code }));
    return reply(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi gangguan. Coba lagi nanti.",
          requestId,
        },
      },
      500,
    );
  }
}
export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as DELETE,
  handler as PUT,
};
