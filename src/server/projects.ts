import { readFile } from "node:fs/promises";
import { readTemplate } from "./templates";
import { applyPublishedSkills, publishedTemplates } from "./admin/content";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { db, json } from "./db";
import { getEnv } from "./config";
import { AppError } from "./errors";
import { userLock, hash, rateLimit } from "./limits";
import { checkModels, llmConfig } from "./llm";
import { catalog } from "../domain/catalog";
import { editPlan } from "../domain/planner";
import {
  entitlementFor,
  requireFeature,
  reserveQuota,
  reservePlanner,
  refundQuota,
} from "./entitlements";
import { regenerationClosure } from "../domain/billing";
import type { Transaction } from "./db";
import {
  readPreferences,
  preferenceConflicts,
  type ProjectPreferences,
} from "../domain/preferences";
import { skillSelectionIssues } from "../domain/skills";
import {
  projectContext,
  planningBrief,
  type ReferenceSnapshot,
} from "../domain/project-context";
import {
  ACTIVE_STATUSES,
  type ResolvedPlan,
  type Snapshot,
  type WebType,
} from "../domain/types";
export const attachmentPublicSelect = {
  id: true,
  name: true,
  mime: true,
  bytes: true,
  checksum: true,
  role: true,
  note: true,
  sourceUrl: true,
  rights: true,
  status: true,
  text: true,
  errorCode: true,
  createdAt: true,
  updatedAt: true,
} as const;
export async function referenceSnapshot(
  client: Pick<Transaction, "projectAttachment">,
  projectId: string,
): Promise<ReferenceSnapshot[]> {
  const references = await client.projectAttachment.findMany({
    where: { projectId, included: true },
    orderBy: { createdAt: "asc" },
    select: attachmentPublicSelect,
  });
  if (
    references.some((reference) =>
      ["queued", "processing"].includes(reference.status),
    )
  )
    throw new AppError(
      "REFERENCES_PROCESSING",
      409,
      "Tunggu pemeriksaan referensi selesai sebelum membuat rencana.",
    );
  if (references.some((reference) => reference.status === "rejected"))
    throw new AppError(
      "REFERENCE_REJECTED",
      409,
      "Hapus atau perbaiki referensi yang ditolak sebelum membuat rencana.",
    );
  return references
    .filter((reference) => reference.status === "ready")
    .map((reference) => ({
      ...reference,
      text: reference.text.slice(0, 2400),
    }));
}
export async function projectFor(userId: string, id: string) {
  const project = await db.project.findFirst({
    where: { id, userId },
    include: {
      plans: { orderBy: { version: "desc" }, take: 1 },
      tasks: { orderBy: { createdAt: "desc" }, take: 1 },
      attachments: {
        where: { included: true },
        orderBy: { createdAt: "asc" },
        select: attachmentPublicSelect,
      },
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          done: true,
          total: true,
          createdAt: true,
        },
      },
    },
  });
  if (!project) throw new AppError("NOT_FOUND", 404, "Proyek tidak ditemukan.");
  return project;
}
export async function saveProject(
  userId: string,
  id: string,
  input: {
    name?: string;
    webType?: WebType;
    brief?: string;
    preferences?: ProjectPreferences;
    attachmentIds?: string[];
    briefVersion: number;
  },
  mutate?: (tx: Transaction) => Promise<void>,
) {
  return db.$transaction(async (tx) => {
    await userLock(tx, userId);
    const project = await tx.project.findFirst({ where: { id, userId } });
    if (!project) throw new AppError("NOT_FOUND", 404);
    if (project.briefVersion !== input.briefVersion)
      throw new AppError(
        "VERSION_CONFLICT",
        409,
        "Draft berubah di tab lain. Muat ulang sebelum menyimpan.",
      );
    if (
      await tx.job.count({
        where: { projectId: id, status: { in: ACTIVE_STATUSES } },
      })
    )
      throw new AppError(
        "JOB_ACTIVE",
        409,
        "Tunggu atau batalkan generasi sebelum mengubah brief.",
      );
    const entitlement = await entitlementFor(userId, tx);
    if (entitlement.features.revisions) {
      const attachments = await tx.projectAttachment.findMany({
        where: { projectId: id, included: true },
        select: {
          id: true,
          role: true,
          note: true,
          sourceUrl: true,
          rights: true,
          text: true,
          status: true,
        },
      });
      await tx.projectRevision.upsert({
        where: {
          projectId_version: { projectId: id, version: project.briefVersion },
        },
        create: {
          projectId: id,
          version: project.briefVersion,
          name: project.name,
          webType: project.webType,
          brief: project.brief,
          preferences: project.preferences as Prisma.InputJsonValue,
          attachmentIds: attachments.map((attachment) => attachment.id),
          attachmentState: json(
            attachments.map(({ status, text, ...metadata }) => ({
              ...metadata,
              ...(status === "ready" ? { text } : {}),
            })),
          ),
        },
        update: {},
      });
      const older = await tx.projectRevision.findMany({
        where: { projectId: id },
        orderBy: { version: "desc" },
        skip: 100,
        select: { id: true },
      });
      if (older.length)
        await tx.projectRevision.deleteMany({
          where: { id: { in: older.map((revision) => revision.id) } },
        });
    }
    const preferences = readPreferences(
      input.preferences ?? project.preferences,
    );
    const conflicts = [
      ...preferenceConflicts(
        preferences,
        (input.webType ?? project.webType) as WebType,
      ),
      ...skillSelectionIssues(preferences),
    ];
    if (conflicts.length)
      throw new AppError("PREFERENCE_CONFLICT", 400, conflicts.join(" "));
    if (input.attachmentIds) {
      await tx.projectAttachment.updateMany({
        where: { projectId: id },
        data: { included: false },
      });
      await tx.projectAttachment.updateMany({
        where: { projectId: id, id: { in: input.attachmentIds } },
        data: { included: true },
      });
    }
    if (mutate) await mutate(tx);
    return tx.project.update({
      where: { id },
      data: {
        name: input.name,
        webType: input.webType,
        brief: input.brief,
        preferences: json(preferences),
        briefVersion: { increment: 1 },
        status: "draft",
        clarified: false,
        clarification: {},
        expiresAt: new Date(Date.now() + getEnv().DRAFT_TTL_HOURS * 3600000),
      },
    });
  });
}
export async function queuePlan(
  userId: string,
  id: string,
  briefVersion: number,
) {
  const env = getEnv();
  await rateLimit(`plan:${userId}`, env.MAX_PLANS_PER_HOUR, 3600);
  const config = await llmConfig();
  return db.$transaction(async (tx) => {
    await userLock(tx, userId);
    const project = await tx.project.findFirst({ where: { id, userId } });
    if (!project) throw new AppError("NOT_FOUND", 404);
    if (project.briefVersion !== briefVersion)
      throw new AppError("VERSION_CONFLICT", 409, "Brief sudah berubah.");
    if (project.brief.trim().length < 20)
      throw new AppError(
        "BRIEF_TOO_SHORT",
        400,
        "Tambahkan brief minimal 20 karakter.",
      );
    if (
      await tx.job.count({
        where: { projectId: id, status: { in: ACTIVE_STATUSES } },
      })
    )
      throw new AppError("JOB_ACTIVE", 409);
    const existing = await tx.planningTask.findFirst({
      where: {
        projectId: id,
        briefVersion,
        status: { in: ["queued", "running"] },
      },
    });
    if (existing) return existing;
    const references = await referenceSnapshot(tx, id);
    const preferences = readPreferences(project.preferences);
    const conflicts = [
      ...preferenceConflicts(preferences, project.webType as WebType),
      ...skillSelectionIssues(preferences),
    ];
    if (conflicts.length)
      throw new AppError("PREFERENCE_CONFLICT", 400, conflicts.join(" "));
    await reservePlanner(tx, userId);
    const prompt = await readFile(
      path.join(process.cwd(), "prompts/planner.system.md"),
      "utf8",
    );
    const task = await tx.planningTask.create({
      data: {
        projectId: id,
        briefVersion,
        snapshot: json({
          brief: planningBrief(project.brief, preferences, references),
          sourceBrief: project.brief,
          templateOverrides: await publishedTemplates(tx),
          projectContext: await applyPublishedSkills(
            projectContext(preferences, project.webType as WebType, references),
            tx,
          ),
          webType: project.webType,
          config,
          prompt,
          clarified: project.clarified,
          catalog,
        }),
      },
    });
    await tx.outboxEvent.create({
      data: { eventType: "plan", resourceId: task.id },
    });
    await tx.project.update({ where: { id }, data: { status: "planning" } });
    return task;
  });
}
export async function changePlan(
  userId: string,
  id: string,
  version: number,
  fileId: string,
  include: boolean,
) {
  return db.$transaction(async (tx) => {
    await userLock(tx, userId);
    const project = await tx.project.findFirst({ where: { id, userId } });
    const current = await tx.plan.findFirst({
      where: { projectId: id },
      orderBy: { version: "desc" },
    });
    if (!project || !current) throw new AppError("NOT_FOUND", 404);
    if (
      current.version !== version ||
      current.briefVersion !== project.briefVersion
    )
      throw new AppError(
        "PLAN_STALE",
        409,
        "Rencana berubah. Muat ulang halaman.",
      );
    if (
      await tx.job.count({
        where: { projectId: id, status: { in: ACTIVE_STATUSES } },
      })
    )
      throw new AppError("JOB_ACTIVE", 409);
    let data: ResolvedPlan;
    try {
      data = editPlan(
        current.data as unknown as ResolvedPlan,
        fileId,
        include,
        getEnv().MAX_DOC_FILES,
      );
    } catch (error) {
      throw new AppError(
        error instanceof Error ? error.message : "INVALID_PLAN",
        400,
        "Pilihan melanggar dokumen wajib, dependensi, atau batas jumlah dokumen.",
      );
    }
    return tx.plan.create({
      data: {
        projectId: id,
        version: version + 1,
        briefVersion: project.briefVersion,
        data: json(data),
        snapshot: current.snapshot as Prisma.InputJsonValue,
      },
    });
  });
}
async function snapshotFor(
  userId: string,
  project: {
    id: string;
    brief: string;
    briefVersion: number;
    webType: string;
    preferences: unknown;
  },
  plan: ResolvedPlan,
  pinned?: {
    projectContext?: import("../domain/project-context").ProjectContext;
    templateOverrides?: Record<string, string>;
  },
): Promise<Snapshot> {
  const templates: Record<string, string> = {};
  const entitlement = await entitlementFor(userId);
  const custom = entitlement.features.templates
    ? await db.documentTemplate.findMany({ where: { userId } })
    : [];
  for (const file of plan.selected) {
    const entry = catalog.find((c) => c.id === file.id);
    if (!entry) throw new AppError("INVALID_PLAN", 409);
    const override = custom.find((template) => template.fileId === file.id);
    if (override) {
      templates[file.id] = override.content;
      continue;
    }
    templates[file.id] =
      pinned?.templateOverrides?.[entry.path] ??
      (await readTemplate(entry, pinned?.templateOverrides === undefined));
  }
  return {
    brief: project.brief,
    webType: project.webType as WebType,
    briefVersion: project.briefVersion,
    config: await llmConfig(),
    catalog,
    templates,
    promptVersion: `v1-${getEnv().TEMPLATE_SOURCE}`,
    writerPrompt: await readFile(
      path.join(process.cwd(), "prompts/generate-file.system.md"),
      "utf8",
    ),
    plan,
    maxRequests: getEnv().MAX_LLM_CALLS_PER_JOB,
    maxFileRequests: getEnv().MAX_FILE_TOTAL_REQUESTS,
    projectContext:
      pinned?.projectContext ??
      (await applyPublishedSkills(
        projectContext(
          project.preferences,
          project.webType as WebType,
          await referenceSnapshot(db, project.id),
        ),
      )),
  };
}
async function prepareJob(
  userId: string,
  projectId: string,
  planVersion: number,
) {
  const project = await projectFor(userId, projectId);
  const current = project.plans[0];
  if (
    !current ||
    current.version !== planVersion ||
    current.briefVersion !== project.briefVersion ||
    project.status !== "plan_ready"
  )
    throw new AppError(
      "PLAN_STALE",
      409,
      "Buat atau perbarui rencana terlebih dahulu.",
    );
  return {
    projectId,
    planId: current.id,
    planVersion,
    briefVersion: current.briefVersion,
    snapshot: await snapshotFor(
      userId,
      project,
      current.data as unknown as ResolvedPlan,
      current.snapshot as {
        projectContext?: import("../domain/project-context").ProjectContext;
        templateOverrides?: Record<string, string>;
      },
    ),
    sourceJobId: null as string | null,
  };
}
type PreparedJob = Awaited<ReturnType<typeof prepareJob>> & {
  copied?: {
    fileId: string;
    content: string | null;
    checksum: string | null;
    modelUsed: string | null;
    tokensIn: number | null;
    tokensOut: number | null;
    finishReason: string | null;
    lint: Prisma.JsonValue;
  }[];
};
async function createQueuedJob(
  tx: Transaction,
  userId: string,
  prepared: PreparedJob,
  key: string,
) {
  const { projectId, planVersion, snapshot } = prepared;
  const operation = prepared.sourceJobId
    ? `regenerate:${prepared.sourceJobId}`
    : `start:${projectId}`;
  const requestHash = hash(
    JSON.stringify({
      projectId,
      planVersion,
      regeneration: snapshot.regeneration?.fileIds,
    }),
  );
  const keyHash = hash(key);
  const duplicate = await tx.idempotencyKey.findUnique({
    where: { userId_operation_keyHash: { userId, operation, keyHash } },
  });
  if (duplicate) {
    if (duplicate.requestHash !== requestHash)
      throw new AppError("IDEMPOTENCY_CONFLICT", 409);
    return { id: duplicate.resourceId };
  }
  const latest = await tx.project.findFirst({
    where: { id: projectId, userId },
  });
  const latestPlan = await tx.plan.findFirst({
    where: { projectId },
    orderBy: { version: "desc" },
  });
  if (
    !latest ||
    (!prepared.sourceJobId &&
      (latest.briefVersion !== prepared.briefVersion ||
        latestPlan?.version !== planVersion))
  )
    throw new AppError("PLAN_STALE", 409, "Rencana sudah berubah.");
  const entitlement = await entitlementFor(userId, tx);
  if (prepared.sourceJobId) await requireFeature(userId, "regeneration", tx);
  const active = await tx.job.findFirst({
    where: { projectId, status: { in: ACTIVE_STATUSES } },
  });
  if (active) {
    if (
      active.planId === prepared.planId &&
      active.sourceJobId === prepared.sourceJobId &&
      JSON.stringify(
        (active.snapshot as unknown as Snapshot).regeneration?.fileIds,
      ) === JSON.stringify(snapshot.regeneration?.fileIds)
    ) {
      await tx.idempotencyKey.create({
        data: {
          userId,
          operation,
          keyHash,
          requestHash,
          resourceId: active.id,
        },
      });
      return { id: active.id };
    }
    throw new AppError("JOB_ACTIVE", 409, "Proyek ini masih diproses.");
  }
  const activeCount = await tx.job.count({
    where: { userId, status: { in: ACTIVE_STATUSES } },
  });
  if (activeCount >= (entitlement.features.batch ? 10 : 1))
    throw new AppError(
      "JOB_ACTIVE",
      409,
      "Batas antrean paket tercapai. Tunggu proses aktif selesai.",
    );
  const job = await tx.job.create({
    data: {
      projectId,
      userId,
      planId: prepared.planId,
      sourceJobId: prepared.sourceJobId,
      billingPlanId: entitlement.planId,
      priority: entitlement.priority,
      retentionDays: entitlement.retentionDays,
      expiresAt: new Date(Date.now() + entitlement.retentionDays * 86400000),
      total: snapshot.plan.selected.length,
      done: prepared.copied?.length ?? 0,
      snapshot: json(snapshot),
      files: {
        create: snapshot.plan.selected.map((f) => {
          const copy = prepared.copied?.find((file) => file.fileId === f.id);
          return {
            fileId: f.id,
            ...(copy
              ? { ...copy, lint: json(copy.lint), status: "succeeded" }
              : {}),
          };
        }),
      },
    },
  });
  await reserveQuota(tx, userId, job.id, entitlement);
  await tx.idempotencyKey.create({
    data: { userId, operation, keyHash, requestHash, resourceId: job.id },
  });
  await tx.outboxEvent.create({
    data: { eventType: "generate", resourceId: job.id },
  });
  await tx.project.update({
    where: { id: projectId },
    data: { status: "generating" },
  });
  await tx.auditEvent.create({
    data: { userId, action: "job.created", resourceId: job.id },
  });
  return { id: job.id };
}
export async function startJob(
  userId: string,
  projectId: string,
  planVersion: number,
  key: string,
) {
  const prior = await db.idempotencyKey.findUnique({
    where: {
      userId_operation_keyHash: {
        userId,
        operation: `start:${projectId}`,
        keyHash: hash(key),
      },
    },
  });
  if (prior) {
    if (prior.requestHash !== hash(JSON.stringify({ projectId, planVersion })))
      throw new AppError("IDEMPOTENCY_CONFLICT", 409);
    return { id: prior.resourceId };
  }
  await rateLimit(`start:${userId}`, 10, 60);
  // A second browser click may arrive after the first transaction changed project status.
  const active = await db.job.findFirst({
    where: {
      userId,
      projectId,
      status: { in: ACTIVE_STATUSES },
      plan: { version: planVersion },
      sourceJobId: null,
    },
  });
  if (active)
    return db.$transaction(async (tx) => {
      await userLock(tx, userId);
      const operation = `start:${projectId}`,
        keyHash = hash(key);
      const requestHash = hash(JSON.stringify({ projectId, planVersion }));
      const duplicate = await tx.idempotencyKey.findUnique({
        where: {
          userId_operation_keyHash: { userId, operation, keyHash },
        },
      });
      if (duplicate) {
        if (duplicate.requestHash !== requestHash)
          throw new AppError("IDEMPOTENCY_CONFLICT", 409);
        return { id: duplicate.resourceId };
      }
      if (
        !(await tx.job.findFirst({
          where: { id: active.id, userId, projectId },
        }))
      )
        throw new AppError("NOT_FOUND", 404);
      await tx.idempotencyKey.create({
        data: {
          userId,
          operation,
          keyHash,
          requestHash,
          resourceId: active.id,
        },
      });
      return { id: active.id };
    });
  const prepared = await prepareJob(userId, projectId, planVersion);
  await checkModels(prepared.snapshot.config);
  return db.$transaction(async (tx) => {
    await userLock(tx, userId);
    return createQueuedJob(tx, userId, prepared, key);
  });
}
export async function startBatch(
  userId: string,
  items: { projectId: string; planVersion: number }[],
  key: string,
) {
  await requireFeature(userId, "batch");
  await rateLimit(`batch:${userId}`, 5, 60);
  if (new Set(items.map((item) => item.projectId)).size !== items.length)
    throw new AppError("DUPLICATE_PROJECT", 400);
  const operation = "batch",
    keyHash = hash(key),
    requestHash = hash(JSON.stringify(items));
  const existing = await db.idempotencyKey.findUnique({
    where: { userId_operation_keyHash: { userId, operation, keyHash } },
  });
  if (existing) {
    if (existing.requestHash !== requestHash)
      throw new AppError("IDEMPOTENCY_CONFLICT", 409);
    return { ids: existing.resourceId.split(",") };
  }
  const prepared = await Promise.all(
    items.map((item) => prepareJob(userId, item.projectId, item.planVersion)),
  );
  await checkModels(prepared[0].snapshot.config);
  return db.$transaction(
    async (tx) => {
      await userLock(tx, userId);
      await requireFeature(userId, "batch", tx);
      const prior = await tx.idempotencyKey.findUnique({
        where: { userId_operation_keyHash: { userId, operation, keyHash } },
      });
      if (prior) {
        if (prior.requestHash !== requestHash)
          throw new AppError("IDEMPOTENCY_CONFLICT", 409);
        return { ids: prior.resourceId.split(",") };
      }
      const ids: string[] = [];
      for (const item of prepared)
        ids.push(
          (await createQueuedJob(tx, userId, item, `${key}:${item.projectId}`))
            .id,
        );
      await tx.idempotencyKey.create({
        data: {
          userId,
          operation,
          keyHash,
          requestHash,
          resourceId: ids.join(","),
        },
      });
      return { ids };
    },
    { timeout: 15000 },
  );
}
export async function regenerateJob(
  userId: string,
  id: string,
  requested: string[],
  key: string,
) {
  await requireFeature(userId, "regeneration");
  await rateLimit(`regenerate:${userId}`, 10, 60);
  const source = await jobFor(userId, id);
  if (
    !["succeeded", "partial"].includes(source.status) ||
    source.quotaRefundedAt
  )
    throw new AppError("RESULT_NOT_READY", 409);
  const snapshot = structuredClone(source.snapshot) as unknown as Snapshot;
  const selected = snapshot.plan.selected.map((file) => file.id);
  let impacted: string[];
  try {
    impacted = regenerationClosure(
      [
        ...requested,
        ...source.files
          .filter((file) => file.status !== "succeeded")
          .map((file) => file.fileId),
      ],
      selected,
      snapshot.catalog,
    );
  } catch {
    throw new AppError(
      "INVALID_SELECTION",
      400,
      "Pilih dokumen dalam paket ini.",
    );
  }
  snapshot.regeneration = { sourceJobId: id, fileIds: impacted };
  const prior = await db.idempotencyKey.findUnique({
    where: {
      userId_operation_keyHash: {
        userId,
        operation: `regenerate:${id}`,
        keyHash: hash(key),
      },
    },
  });
  const plan = await db.plan.findUniqueOrThrow({
    where: { id: source.planId },
  });
  if (prior) {
    if (
      prior.requestHash !==
      hash(
        JSON.stringify({
          projectId: source.projectId,
          planVersion: plan.version,
          regeneration: impacted,
        }),
      )
    )
      throw new AppError("IDEMPOTENCY_CONFLICT", 409);
    return { id: prior.resourceId, impacted };
  }
  await checkModels(snapshot.config);
  const copied = source.files
    .filter(
      (file) => !impacted.includes(file.fileId) && file.status === "succeeded",
    )
    .map(
      ({
        fileId,
        content,
        checksum,
        modelUsed,
        tokensIn,
        tokensOut,
        finishReason,
        lint,
      }) => ({
        fileId,
        content,
        checksum,
        modelUsed,
        tokensIn,
        tokensOut,
        finishReason,
        lint,
      }),
    );
  return db.$transaction(async (tx) => {
    await userLock(tx, userId);
    const job = await createQueuedJob(
      tx,
      userId,
      {
        projectId: source.projectId,
        planId: source.planId,
        planVersion: plan.version,
        briefVersion: snapshot.briefVersion,
        snapshot,
        sourceJobId: id,
        copied,
      },
      key,
    );
    return { ...job, impacted };
  });
}
export async function jobFor(userId: string, id: string) {
  const job = await db.job.findFirst({
    where: { id, userId },
    include: {
      files: true,
      project: { select: { name: true, id: true, webType: true } },
    },
  });
  if (!job) throw new AppError("NOT_FOUND", 404, "Proses tidak ditemukan.");
  if (job.finishedAt && job.expiresAt.getTime() <= Date.now())
    throw new AppError(
      "RESULT_EXPIRED",
      410,
      "Masa penyimpanan hasil sudah berakhir.",
    );
  return job;
}
export async function resumeJob(
  userId: string,
  id: string,
  key: string,
  transaction?: Transaction,
) {
  const previous = await db.idempotencyKey.findUnique({
    where: {
      userId_operation_keyHash: {
        userId,
        operation: `resume:${id}`,
        keyHash: hash(key),
      },
    },
  });
  if (previous) return { id: previous.resourceId };
  await rateLimit(`resume:${userId}`, 5, 60);
  const job = await jobFor(userId, id);
  const snapshot = job.snapshot as unknown as Snapshot;
  await checkModels(snapshot.config);
  const run = async (tx: Transaction) => {
    await userLock(tx, userId);
    const operation = `resume:${id}`,
      keyHash = hash(key);
    const prior = await tx.idempotencyKey.findUnique({
      where: { userId_operation_keyHash: { userId, operation, keyHash } },
    });
    if (prior) return { id };
    const current = await tx.job.findUnique({
      where: { id },
      include: { files: true },
    });
    if (
      !current ||
      current.quotaRefundedAt ||
      !["partial", "failed"].includes(current.status) ||
      !current.files.some((f) => f.status !== "succeeded")
    )
      throw new AppError(
        "NOT_RESUMABLE",
        409,
        "Proses ini tidak dapat dilanjutkan.",
      );
    const entitlement = await entitlementFor(userId, tx);
    if (
      (await tx.job.count({
        where: { userId, status: { in: ACTIVE_STATUSES } },
      })) >= (entitlement.features.batch ? 10 : 1) ||
      (await tx.job.count({
        where: { projectId: job.projectId, status: { in: ACTIVE_STATUSES } },
      }))
    )
      throw new AppError("JOB_ACTIVE", 409);
    if (current.llmRequestCount >= snapshot.maxRequests)
      throw new AppError(
        "REQUEST_BUDGET",
        409,
        "Batas request proses tercapai.",
      );
    await tx.job.update({
      where: { id },
      data: {
        status: "queued",
        errorCode: null,
        cancelRequestedAt: null,
        finishedAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    });
    await tx.jobFile.updateMany({
      where: { jobId: id, status: { not: "succeeded" } },
      data: { status: "pending", errorCode: null },
    });
    await tx.project.update({
      where: { id: job.projectId },
      data: { status: "generating" },
    });
    await tx.outboxEvent.create({
      data: { eventType: "generate", resourceId: id },
    });
    await tx.idempotencyKey.create({
      data: {
        userId,
        operation,
        keyHash,
        requestHash: hash(id),
        resourceId: id,
      },
    });
    return { id };
  };
  return transaction ? run(transaction) : db.$transaction(run);
}
export async function cancelJob(
  userId: string,
  id: string,
  transaction?: Transaction,
) {
  const run = async (tx: Transaction) => {
    await userLock(tx, userId);
    const job = await tx.job.findFirst({ where: { id, userId } });
    if (!job) throw new AppError("NOT_FOUND", 404);
    if (!ACTIVE_STATUSES.includes(job.status))
      return { id, status: job.status };
    const status = job.status === "queued" ? "cancelled" : "cancel_requested";
    await tx.job.update({
      where: { id },
      data: {
        status,
        cancelRequestedAt: new Date(),
        ...(status === "cancelled" ? { finishedAt: new Date() } : {}),
      },
    });
    if (status === "cancelled")
      await tx.project.update({
        where: { id: job.projectId },
        data: { status: "cancelled" },
      });
    if (status === "cancelled" && job.llmRequestCount === 0)
      await refundQuota(tx, userId, id, "cancelled_before_ai");
    return { id, status };
  };
  return transaction ? run(transaction) : db.$transaction(run);
}
