import { db, json } from "../server/db";
import { AppError, errorCode } from "../server/errors";
import { getEnv } from "../server/config";
import { userLock } from "../server/limits";
import { resolvePlan } from "../domain/planner";
import { deterministicPlan } from "../domain/deterministic-planner";
import type { CatalogEntry, WebType } from "../domain/types";

export async function processPlan(id: string) {
  const claimed = await db.planningTask.updateMany({
    where: { id, status: "queued" },
    data: { status: "running", heartbeatAt: new Date() },
  });
  if (!claimed.count) return;
  const task = await db.planningTask.findUniqueOrThrow({
    where: { id },
    include: { project: true },
  });
  const snapshot = task.snapshot as unknown as {
    brief: string;
    sourceBrief?: string;
    webType: WebType;
    config: { mock: boolean };
    prompt: string;
    clarified: boolean;
    catalog: CatalogEntry[];
    projectContext?: import("../domain/project-context").ProjectContext;
    templateOverrides?: Record<string, string>;
  };
  const timer = setInterval(() => {
    void db.planningTask
      .updateMany({
        where: { id, status: "running" },
        data: { heartbeatAt: new Date() },
      })
      .catch(() =>
        console.error(
          JSON.stringify({ event: "plan.heartbeat.failed", taskId: id }),
        ),
      );
  }, 10000);
  try {
    // Deterministic planning — no LLM calls needed
    const output = deterministicPlan({
      brief: snapshot.brief,
      webType: snapshot.webType,
      projectName: task.project.name,
      entries: snapshot.catalog,
    });

    const plan = resolvePlan(
      output,
      snapshot.brief,
      snapshot.webType,
      getEnv().MAX_DOC_FILES,
      snapshot.catalog,
      false,
    );

    const clarification =
      getEnv().CLARIFY_MODE !== "off" &&
      !snapshot.clarified &&
      plan.missing_info.filter((q) => q.impact === "high").length >= 3;

    await db.$transaction(async (tx) => {
      await userLock(tx, task.project.userId);
      const current = await tx.planningTask.updateMany({
        where: { id, status: "running" },
        data: { heartbeatAt: new Date() },
      });
      if (!current.count) return;
      const project = await tx.project.findUnique({
        where: { id: task.projectId },
      });
      if (!project || project.briefVersion !== task.briefVersion) {
        await tx.planningTask.update({
          where: { id },
          data: { status: "stale" },
        });
        return;
      }
      const latest = await tx.plan.findFirst({
        where: { projectId: project.id },
        orderBy: { version: "desc" },
      });
      await tx.plan.create({
        data: {
          projectId: project.id,
          version: (latest?.version ?? 0) + 1,
          briefVersion: task.briefVersion,
          data: json(plan),
          snapshot: json({
            templateOverrides: snapshot.templateOverrides,
            catalog: snapshot.catalog,
            model: "deterministic",
            prompt: "template-based",
            projectContext: snapshot.projectContext,
          }),
        },
      });
      await tx.project.update({
        where: { id: project.id },
        data: {
          status: clarification ? "needs_clarification" : "plan_ready",
          name:
            project.name === "Proyek tanpa judul"
              ? plan.project_name
              : project.name,
        },
      });
      await tx.planningTask.update({
        where: { id },
        data: { status: "succeeded" },
      });
    });
  } catch (error) {
    const code = errorCode(error);
    await db.$transaction(async (tx) => {
      const failed = await tx.planningTask.updateMany({
        where: { id, status: "running" },
        data: { status: "failed", errorCode: code },
      });
      if (!failed.count) return;
      await tx.project.updateMany({
        where: {
          id: task.projectId,
          briefVersion: task.briefVersion,
          status: "planning",
        },
        data: { status: "draft" },
      });
      await tx.auditEvent.create({
        data: {
          userId: task.project.userId,
          action: "plan.failed",
          resourceId: id,
          errorCode: code,
        },
      });
    });
    if (!(error instanceof AppError))
      console.error(JSON.stringify({ event: "plan.failed", taskId: id, code }));
  } finally {
    clearInterval(timer);
  }
}
