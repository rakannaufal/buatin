import { db, json } from "./db";
import { userLock } from "./limits";
import { ACTIVE_STATUSES } from "../domain/types";
import {
  cleanupDetachedReferences,
  cleanupReferenceStorage,
  referenceStorageConfigured,
} from "./reference-storage";

// Once-daily Hobby cron: bounded batches, no provider calls or financial deletion.
export async function requestMaintenance() {
  const key = "maintenance.request";
  const lease = { owner: crypto.randomUUID(), expiresAt: Date.now() + 240000 };
  const acquired = await db.$transaction(async (tx) => {
    await userLock(tx, key);
    const state = await tx.setting.findUnique({ where: { key } });
    const prior = state?.value as { expiresAt?: number } | undefined;
    if (typeof prior?.expiresAt === "number" && prior.expiresAt > Date.now())
      return false;
    await tx.setting.upsert({
      where: { key },
      create: { key, value: json(lease) },
      update: { value: json(lease) },
    });
    return true;
  });
  if (!acquired) return { busy: true };
  const now = new Date(),
    deadline = Date.now() + 90000;
  try {
    const jobs = await db.job.findMany({
      where: { expiresAt: { lt: now }, status: { notIn: ACTIVE_STATUSES } },
      take: 20,
    });
    for (const job of jobs) {
      if (Date.now() >= deadline) break;
      await db.$transaction(async (tx) => {
        await userLock(tx, job.userId);
        const current = await tx.job.findFirst({
          where: {
            id: job.id,
            expiresAt: { lt: now },
            status: { notIn: ACTIVE_STATUSES },
          },
        });
        if (!current) return;
        await tx.outboxEvent.deleteMany({ where: { resourceId: job.id } });
        await tx.job.delete({ where: { id: job.id } });
      });
    }
    const projects = await db.project.findMany({
      where: {
        jobs: { none: {} },
        tasks: { none: { status: { in: ["queued", "running"] } } },
        OR: [
          { updatedAt: { lt: new Date(Date.now() - 14 * 86400000) } },
          { status: "draft", expiresAt: { lt: now } },
        ],
      },
      take: 20,
    });
    for (const project of projects) {
      if (Date.now() >= deadline) break;
      await db.$transaction(async (tx) => {
        await userLock(tx, project.userId);
        const current = await tx.project.findFirst({
          where: {
            id: project.id,
            updatedAt: project.updatedAt,
            jobs: { none: {} },
            tasks: { none: { status: { in: ["queued", "running"] } } },
          },
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
    const limits = await db.requestLimit.findMany({
      where: { expiresAt: { lt: now } },
      take: 500,
      select: { key: true },
    });
    await db.requestLimit.deleteMany({
      where: {
        key: { in: limits.map((row) => row.key) },
        expiresAt: { lt: now },
      },
    });
    const sessions = await db.session.findMany({
      where: { expiresAt: { lt: now } },
      take: 500,
      select: { id: true },
    });
    await db.session.deleteMany({
      where: {
        id: { in: sessions.map((row) => row.id) },
        expiresAt: { lt: now },
      },
    });
    const verification = await db.verification.findMany({
      where: { expiresAt: { lt: now } },
      take: 500,
      select: { id: true },
    });
    await db.verification.deleteMany({
      where: {
        id: { in: verification.map((row) => row.id) },
        expiresAt: { lt: now },
      },
    });
    const cutoff = new Date(Date.now() - 7 * 86400000);
    const outbox = await db.outboxEvent.findMany({
      where: { dispatchedAt: { lt: cutoff } },
      take: 500,
      select: { id: true },
    });
    await db.outboxEvent.deleteMany({
      where: {
        id: { in: outbox.map((row) => row.id) },
        dispatchedAt: { lt: cutoff },
      },
    });
    await cleanupDetachedReferences(deadline);
    if (Date.now() < deadline && referenceStorageConfigured())
      await cleanupReferenceStorage(deadline);
    await db.setting.upsert({
      where: { key: "maintenance" },
      create: {
        key: "maintenance",
        value: { at: now.toISOString(), mode: "request" },
      },
      update: { value: { at: now.toISOString(), mode: "request" } },
    });
    return { busy: false, completedAt: new Date().toISOString() };
  } finally {
    await db.setting.deleteMany({
      where: { key, value: { equals: json(lease) } },
    });
  }
}
