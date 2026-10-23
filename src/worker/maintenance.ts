import { db, json } from "../server/db";
import { getEnv } from "../server/config";
import { ACTIVE_STATUSES } from "../domain/types";
import { userLock } from "../server/limits";
import { refundUnusedJobQuota } from "../server/entitlements";
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import type { Prisma } from "@prisma/client";
import {
  cleanupReferenceStorage,
  cleanupDetachedReferences,
} from "../server/reference-storage";
export async function maintenance() {
  const now = new Date();
  await db.projectAttachment.updateMany({
    where: {
      status: "processing",
      updatedAt: { lt: new Date(Date.now() - 300000) },
    },
    data: { status: "rejected", errorCode: "REFERENCE_INTERRUPTED" },
  });
  const pendingReferences = await db.projectAttachment.findMany({
    where: {
      status: "queued",
      included: true,
      updatedAt: { lt: new Date(Date.now() - 60000) },
    },
    take: 50,
  });
  for (const reference of pendingReferences)
    await db.outboxEvent.create({
      data: { eventType: "reference", resourceId: reference.id },
    });
  await db.$transaction(async (tx) => {
    const queueCutoff = new Date(
      Date.now() - getEnv().JOB_STALE_AFTER_SEC * 1000,
    );
    for (const job of await tx.job.findMany({
      where: { status: "queued", heartbeatAt: { lt: queueCutoff } },
    })) {
      const recovered = await tx.job.updateMany({
        where: {
          id: job.id,
          status: "queued",
          heartbeatAt: { lt: queueCutoff },
        },
        data: { heartbeatAt: now },
      });
      if (recovered.count)
        await tx.outboxEvent.create({
          data: { eventType: "generate", resourceId: job.id },
        });
    }
    for (const task of await tx.planningTask.findMany({
      where: { status: "queued", heartbeatAt: { lt: queueCutoff } },
    })) {
      const recovered = await tx.planningTask.updateMany({
        where: {
          id: task.id,
          status: "queued",
          heartbeatAt: { lt: queueCutoff },
        },
        data: { heartbeatAt: now },
      });
      if (recovered.count)
        await tx.outboxEvent.create({
          data: { eventType: "plan", resourceId: task.id },
        });
    }
    const stale = await tx.job.findMany({
      where: {
        status: { in: ["running", "validating", "cancel_requested"] },
        leaseExpiresAt: { lt: now },
      },
    });
    for (const job of stale) {
      await userLock(tx, job.userId);
      const result = await tx.job.updateMany({
        where: {
          id: job.id,
          leaseVersion: job.leaseVersion,
          status: { in: ACTIVE_STATUSES },
          leaseExpiresAt: { lt: now },
        },
        data: {
          status: job.cancelRequestedAt ? "cancelled" : "failed",
          errorCode: "WORKER_INTERRUPTED",
          leaseVersion: { increment: 1 },
          leaseOwner: null,
          leaseExpiresAt: null,
          finishedAt: now,
        },
      });
      if (result.count) {
        await tx.project.update({
          where: { id: job.projectId },
          data: { status: job.cancelRequestedAt ? "cancelled" : "failed" },
        });
        if (job.cancelRequestedAt)
          await refundUnusedJobQuota(
            tx,
            job.userId,
            job.id,
            "cancelled_before_output",
          );
      }
    }
    const tasks = await tx.planningTask.findMany({
      where: {
        status: "running",
        heartbeatAt: {
          lt: new Date(Date.now() - getEnv().JOB_STALE_AFTER_SEC * 1000),
        },
      },
    });
    for (const task of tasks) {
      await tx.planningTask.updateMany({
        where: { id: task.id, status: "running" },
        data: { status: "failed", errorCode: "WORKER_INTERRUPTED" },
      });
      await tx.project.updateMany({
        where: {
          id: task.projectId,
          briefVersion: task.briefVersion,
          status: "planning",
        },
        data: { status: "draft" },
      });
    }
  });
  const cutoff = new Date(Date.now() - 180 * 86400000);
  const expiredJobs = await db.job.findMany({
    where: { expiresAt: { lt: now }, status: { notIn: ACTIVE_STATUSES } },
    take: 100,
  });
  for (const job of expiredJobs) {
    await db.$transaction(async (tx) => {
      await userLock(tx, job.userId);
      const current = await tx.job.findFirst({
        where: {
          id: job.id,
          status: { notIn: ACTIVE_STATUSES },
          expiresAt: { lt: now },
        },
      });
      if (!current) return;
      await tx.outboxEvent.deleteMany({ where: { resourceId: job.id } });
      await tx.job.deleteMany({
        where: {
          id: job.id,
          status: { notIn: ACTIVE_STATUSES },
          expiresAt: { lt: now },
        },
      });
    });
  }
  const expiredProjectWhere = {
    OR: [
      { updatedAt: { lt: new Date(Date.now() - 14 * 86400000) } },
      { status: "draft", expiresAt: { lt: now } },
    ],
    jobs: { none: {} },
    tasks: { none: { status: { in: ["queued", "running"] } } },
  } satisfies Prisma.ProjectWhereInput;
  const expired = await db.project.findMany({
    where: expiredProjectWhere,
    take: 100,
  });
  for (const project of expired) {
    await db.$transaction(async (tx) => {
      await userLock(tx, project.userId);
      // A draft can be edited or queued after the cleanup candidate query.
      const current = await tx.project.findFirst({
        where: { ...expiredProjectWhere, id: project.id },
        include: {
          tasks: { select: { id: true } },
          attachments: { select: { id: true } },
        },
      });
      if (!current) return;
      await tx.outboxEvent.deleteMany({
        where: {
          resourceId: {
            in: [...current.tasks, ...current.attachments].map(
              (item) => item.id,
            ),
          },
        },
      });
      await tx.project.delete({ where: { id: current.id } });
    });
  }
  await db.requestLimit.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.auditEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  await db.aiUsage.deleteMany({ where: { createdAt: { lt: cutoff } } });
  await db.aiBudgetPeriod.deleteMany({
    where: { day: { lt: cutoff.toISOString().slice(0, 10) } },
  });
  await db.dataRequest.deleteMany({
    where: {
      status: { in: ["completed", "rejected"] },
      updatedAt: { lt: cutoff },
    },
  });
  await db.idempotencyKey.deleteMany({
    where: { createdAt: { lt: cutoff }, operation: { not: "checkout" } },
  });
  await db.outboxEvent.deleteMany({ where: { dispatchedAt: { lt: cutoff } } });
  await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.verification.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.emailMessage.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 7 * 86400000) } },
  });
  const mailDirectory = path.resolve(".local/mail");
  const localMessages = await readdir(mailDirectory).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );
  for (const name of localMessages) {
    if (!/^[a-f0-9-]+\.txt$/.test(name)) continue;
    const file = path.join(mailDirectory, name);
    if ((await stat(file)).mtimeMs < Date.now() - 7 * 86400000)
      await unlink(file);
  }
  await db.rateLimit.deleteMany({
    where: { lastRequest: { lt: Date.now() - 3600000 } },
  });
  await db.setting.upsert({
    where: { key: "maintenance" },
    create: { key: "maintenance", value: json({ at: now.toISOString() }) },
    update: { value: json({ at: now.toISOString() }) },
  });
  await cleanupDetachedReferences();
  await cleanupReferenceStorage();
}
