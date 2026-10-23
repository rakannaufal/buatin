import { db, json } from "./db";
import { getEnv } from "./config";
import { userLock } from "./limits";
import { activeUser } from "./admin/security";
import { refundUnusedJobQuota } from "./entitlements";
import { processPlan } from "../worker/planner";
import { generateJob } from "../worker/generator";
import { processReference } from "../worker/references";

// Database leases survive function termination. Never rely on in-memory locks.
export async function processUserWork(userId: string) {
  if (getEnv().PROCESSING_MODE !== "request")
    return { mode: "worker", busy: false };
  await activeUser(userId);
  const key = `processing:${userId}`;
  const lease = { owner: crypto.randomUUID(), expiresAt: Date.now() + 240000 };
  const acquired = await db.$transaction(async (tx) => {
    await userLock(tx, userId);
    const prior = await tx.setting.findUnique({ where: { key } });
    const value = prior?.value as { expiresAt?: number } | undefined;
    if (typeof value?.expiresAt === "number" && value.expiresAt > Date.now())
      return false;
    await tx.setting.upsert({
      where: { key },
      create: { key, value: json(lease) },
      update: { value: json(lease) },
    });
    return true;
  });
  if (!acquired) return { mode: "request", busy: true };
  try {
    await recoverUserWork(userId);
    const reference = await db.projectAttachment.findFirst({
      where: { project: { userId }, included: true, status: "queued" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (reference) {
      await processReference(reference.id);
      await acknowledge("reference", reference.id);
      return { mode: "request", processed: "reference" };
    }
    const task = await db.planningTask.findFirst({
      where: { project: { userId }, status: "queued" },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (task) {
      await processPlan(task.id);
      await acknowledge("plan", task.id);
      return { mode: "request", processed: "plan" };
    }
    const job = await db.job.findFirst({
      where: { userId, status: "queued" },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    if (job) {
      await generateJob(job.id, { maxFiles: 6, budgetMs: 15000 });
      await acknowledge("generate", job.id);
      return { mode: "request", processed: "job" };
    }
    return { mode: "request", processed: null };
  } finally {
    await db.setting.deleteMany({
      where: { key, value: { equals: json(lease) } },
    });
  }
}

async function acknowledge(eventType: string, resourceId: string) {
  await db.outboxEvent.updateMany({
    where: { eventType, resourceId, dispatchedAt: null },
    data: { dispatchedAt: new Date() },
  });
}

export async function recoverUserWork(userId: string) {
  const now = new Date();
  const cutoff = new Date(Date.now() - 300000);
  await db.$transaction(async (tx) => {
    await userLock(tx, userId);
    const jobs = await tx.job.findMany({
      where: {
        userId,
        status: { in: ["running", "validating", "cancel_requested"] },
        leaseExpiresAt: { lt: now },
      },
      take: 10,
    });
    for (const job of jobs) {
      const cancelled = Boolean(
        job.cancelRequestedAt || job.status === "cancel_requested",
      );
      await tx.job.update({
        where: { id: job.id },
        data: {
          status: cancelled ? "cancelled" : "queued",
          leaseOwner: null,
          leaseVersion: { increment: 1 },
          leaseExpiresAt: null,
          heartbeatAt: now,
          errorCode: null,
          ...(cancelled ? { finishedAt: now } : {}),
        },
      });
      if (cancelled) {
        await tx.jobFile.updateMany({
          where: { jobId: job.id, status: { in: ["pending", "running"] } },
          data: { status: "cancelled" },
        });
        await tx.project.update({
          where: { id: job.projectId },
          data: { status: "cancelled" },
        });
        await refundUnusedJobQuota(
          tx,
          userId,
          job.id,
          "cancelled_before_output",
        );
      }
    }
    await tx.planningTask.updateMany({
      where: {
        project: { userId },
        status: "running",
        heartbeatAt: { lt: cutoff },
      },
      data: { status: "queued", heartbeatAt: now, errorCode: null },
    });
    await tx.projectAttachment.updateMany({
      where: {
        project: { userId },
        included: true,
        status: "processing",
        updatedAt: { lt: cutoff },
      },
      data: {
        status: "queued",
        processingVersion: { increment: 1 },
        errorCode: null,
      },
    });
  });
}
