import { db, json } from "../server/db";
import { getEnv } from "../server/config";
import { AppError, errorCode } from "../server/errors";
import { hash, userLock } from "../server/limits";
import { refundUnusedJobQuota } from "../server/entitlements";
import { activeUser } from "../server/admin/security";
import { suspended } from "../domain/admin";
import { lintOutput, manifestFor, type OutputFile } from "../domain/lint";
import { renderTemplate } from "../domain/template-engine";
import { resolveVariables } from "../domain/template-variables";
import { applyCustomization } from "../domain/customization-output";
import { resolvePreferences } from "../domain/preferences";
import {
  ACTIVE_STATUSES,
  type Snapshot,
  type LintIssue,
} from "../domain/types";

export async function generateJob(id: string) {
  const owner = crypto.randomUUID();
  const expires = () =>
    new Date(Date.now() + getEnv().JOB_STALE_AFTER_SEC * 1000);
  const claimed = await db.$transaction(async (tx) => {
    const target = await tx.job.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!target) return { count: 0 };
    await userLock(tx, target.userId);
    const candidate = await tx.job.findUnique({ where: { id } });
    if (!candidate || candidate.status !== "queued") return { count: 0 };
    const account = await tx.user.findUnique({
      where: { id: candidate.userId },
    });
    if (!account || suspended(account)) {
      await tx.job.update({
        where: { id },
        data: {
          status: "cancelled",
          errorCode: "ACCOUNT_SUSPENDED",
          finishedAt: new Date(),
        },
      });
      await tx.jobFile.updateMany({
        where: { jobId: id, status: "pending" },
        data: { status: "cancelled" },
      });
      await tx.project.update({
        where: { id: candidate.projectId },
        data: { status: "cancelled" },
      });
      await refundUnusedJobQuota(
        tx,
        candidate.userId,
        id,
        "suspended_before_output",
      );
      return { count: 0 };
    }
    if (
      await tx.job.count({
        where: {
          userId: candidate.userId,
          status: { in: ["running", "validating", "cancel_requested"] },
        },
      })
    )
      return { count: 0 };
    return tx.job.updateMany({
      where: { id, status: "queued" },
      data: {
        status: "running",
        leaseOwner: owner,
        leaseVersion: { increment: 1 },
        leaseExpiresAt: expires(),
        startedAt: candidate.startedAt ?? new Date(),
        heartbeatAt: new Date(),
      },
    });
  });
  if (!claimed.count) return;
  const initial = await db.job.findUniqueOrThrow({
    where: { id },
    include: { project: true },
  });
  const version = initial.leaseVersion;
  const snapshot = initial.snapshot as unknown as Snapshot;
  let lost = false;
  const fence = {
    id,
    leaseOwner: owner,
    leaseVersion: version,
    status: { in: ["running", "validating"] },
  };
  const check = async () => {
    await activeUser(initial.userId);
    if (lost) throw new AppError("LEASE_LOST", 409);
    const job = await db.job.findUnique({
      where: { id },
      select: {
        leaseOwner: true,
        leaseVersion: true,
        cancelRequestedAt: true,
        status: true,
      },
    });
    if (!job || job.leaseOwner !== owner || job.leaseVersion !== version)
      throw new AppError("LEASE_LOST", 409);
    if (job.cancelRequestedAt || job.status === "cancel_requested")
      throw new AppError("CANCELLED", 409);
  };
  const fenced = async (
    tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  ) => {
    await userLock(tx, initial.userId);
    const result = await tx.job.updateMany({
      where: fence,
      data: { heartbeatAt: new Date(), leaseExpiresAt: expires() },
    });
    if (!result.count) {
      await check();
      throw new AppError("LEASE_LOST", 409);
    }
  };
  const timer = setInterval(() => {
    void db.job
      .updateMany({
        where: {
          id,
          leaseOwner: owner,
          leaseVersion: version,
          status: { in: ACTIVE_STATUSES },
        },
        data: { heartbeatAt: new Date(), leaseExpiresAt: expires() },
      })
      .then((r) => {
        if (!r.count) lost = true;
      })
      .catch(() => {
        lost = true;
        console.error(
          JSON.stringify({ event: "job.heartbeat.failed", jobId: id }),
        );
      });
  }, getEnv().JOB_HEARTBEAT_SEC * 1000);
  try {
    // Resolve preferences for template variables
    const preferences = snapshot.projectContext
      ? {
          technology: snapshot.projectContext.preferences.technology,
          additionalTechnology:
            snapshot.projectContext.preferences.additionalTechnology,
          palette: snapshot.projectContext.preferences.palette,
          style: snapshot.projectContext.preferences.style,
          modes: snapshot.projectContext.preferences.modes,
          lockedTechnology:
            snapshot.projectContext.preferences.lockedTechnology,
          lockedStyle: snapshot.projectContext.preferences.lockedStyle,
        }
      : resolvePreferences(
          {
            schemaVersion: 1 as const,
            technology: { mode: "auto" as const, choices: {}, additional: "" },
            colors: {
              mode: "auto" as const,
              palette: [
                { name: "Primary", hex: "#235C46" },
                { name: "Secondary", hex: "#C5A16D" },
              ],
            },
            style: { mode: "auto" as const, values: {} },
            skills: { mode: "auto" as const, selected: [] },
          },
          snapshot.webType,
        );

    const variables = resolveVariables({
      projectName: initial.project.name,
      projectSlug: snapshot.plan.project_slug,
      brief: snapshot.brief,
      webType: snapshot.webType,
      plan: snapshot.plan,
      preferences,
      skills: snapshot.projectContext?.skills ?? [],
      references: snapshot.projectContext?.references ?? [],
      catalog: snapshot.catalog,
    });

    await check();

    // Generate all files from templates — no LLM calls needed
    for (const selected of snapshot.plan.selected) {
      await check();
      const entry = snapshot.catalog.find((f) => f.id === selected.id)!;
      const file = await db.jobFile.findUniqueOrThrow({
        where: { jobId_fileId: { jobId: id, fileId: entry.id } },
      });
      if (file.status === "succeeded") continue;

      await db.$transaction(async (tx) => {
        await userLock(tx, initial.userId);
        await fenced(tx);
        await tx.jobFile.update({
          where: { jobId_fileId: { jobId: id, fileId: entry.id } },
          data: { status: "running", errorCode: null },
        });
      });

      try {
        const template = snapshot.templates[entry.id];
        if (!template) {
          await db.$transaction(async (tx) => {
            await fenced(tx);
            await tx.jobFile.update({
              where: { jobId_fileId: { jobId: id, fileId: entry.id } },
              data: { status: "failed", errorCode: "TEMPLATE_MISSING" },
            });
          });
          continue;
        }

        const docVars: Record<string, unknown> = {
          ...(variables as unknown as Record<string, unknown>),
          skillsForDocument: variables.skills.filter((s) =>
            s.documents.includes(entry.id),
          ),
          currentFileId: entry.id,
          currentFilePath: entry.path,
        };

        let content = renderTemplate(template, docVars);

        // Apply customization (appends locked preferences, skills, references)
        content = applyCustomization(
          content,
          entry.id,
          snapshot.projectContext,
        );

        // Append document list for index
        if (entry.id === "index")
          content +=
            "\n## Dokumen dalam paket\n\n" +
            snapshot.plan.selected
              .map(
                (f) =>
                  `- [${f.path}](${f.id === "agents" ? "../AGENTS.md" : f.path.replace("specs/", "")}): ${f.reason}`,
              )
              .join("\n") +
            "\n";

        // Append read order for agents
        if (entry.id === "agents")
          content +=
            "\n## Urutan baca\n\n" +
            snapshot.plan.selected
              .filter((f) => f.id !== "agents")
              .map((f) => `- [${f.path}](${f.path})`)
              .join("\n") +
            "\n";

        const lint = lintOutput(
          [
            {
              id: entry.id,
              path: entry.path,
              content,
              finishReason: "complete",
            },
          ],
          runtimeSecrets(),
        ).filter(
          (issue) =>
            !["BROKEN_REFERENCE", "TRACEABILITY_GAP"].includes(issue.code),
        );

        await db.$transaction(async (tx) => {
          await fenced(tx);
          await tx.jobFile.update({
            where: { jobId_fileId: { jobId: id, fileId: entry.id } },
            data: {
              status: "succeeded",
              content,
              checksum: hash(content),
              modelUsed: null,
              tokensIn: null,
              tokensOut: null,
              finishReason: "complete",
              lint: json(lint),
            },
          });
          const done = await tx.jobFile.count({
            where: { jobId: id, status: "succeeded" },
          });
          await tx.job.update({ where: { id }, data: { done } });
        });
      } catch (error) {
        const code = errorCode(error);
        if (["CANCELLED", "ACCOUNT_SUSPENDED", "LEASE_LOST"].includes(code))
          throw error;
        await db.$transaction(async (tx) => {
          await fenced(tx);
          await tx.jobFile.update({
            where: { jobId_fileId: { jobId: id, fileId: entry.id } },
            data: { status: "failed", errorCode: code },
          });
        });
      }
    }

    await check();
    await db.job.updateMany({ where: fence, data: { status: "validating" } });
    const files = await db.jobFile.findMany({ where: { jobId: id } });
    const outputs: OutputFile[] = files
      .filter((f) => f.status === "succeeded" && f.content)
      .map((f) => ({
        id: f.fileId,
        path: snapshot.catalog.find((c) => c.id === f.fileId)!.path,
        content: f.content!,
        finishReason: f.finishReason,
      }));

    const issues: LintIssue[] = lintOutput(outputs, runtimeSecrets());

    issues.push({
      code: "TEMPLATE_OUTPUT",
      message:
        "Dokumen dihasilkan dari template terstruktur, bukan AI. Tinjau sebelum digunakan.",
      severity: "warning",
      blocksExport: false,
    });

    const missing = files
      .filter((f) => f.status !== "succeeded")
      .map((f) => f.fileId);
    const status =
      missing.length || issues.some((i) => i.blocksExport)
        ? "partial"
        : "succeeded";
    const manifest = {
      ...manifestFor(
        {
          name: initial.project.name,
          slug: snapshot.plan.project_slug,
          webType: snapshot.webType,
        },
        outputs,
        issues,
        missing,
        snapshot.plan.assumptions,
      ),
      generationMode: "template" as const,
      customization: snapshot.projectContext
        ? {
            preferences: snapshot.projectContext.preferences,
            loading: snapshot.projectContext.loading,
            skills: snapshot.projectContext.skills.map(
              ({ id, name, source, version, checksum, license }) => ({
                id,
                name,
                source,
                version,
                checksum,
                license,
              }),
            ),
            references: snapshot.projectContext.references.map(
              ({ id, name, checksum, role, status }) => ({
                id,
                name,
                checksum,
                role,
                status,
              }),
            ),
          }
        : undefined,
    };
    await db.$transaction(async (tx) => {
      await fenced(tx);
      await tx.job.update({
        where: { id },
        data: {
          status,
          done: outputs.length,
          failed: missing.length,
          lint: json(issues),
          manifest: json(manifest),
          finishedAt: new Date(),
          expiresAt: new Date(Date.now() + initial.retentionDays * 86400000),
          leaseExpiresAt: null,
        },
      });
      await tx.project.update({
        where: { id: initial.projectId },
        data: {
          status: status === "succeeded" ? "completed" : "completed_partial",
        },
      });
    });
  } catch (error) {
    const code = errorCode(error);
    if (code !== "LEASE_LOST")
      await db.$transaction(async (tx) => {
        await userLock(tx, initial.userId);
        const status = code === "CANCELLED" ? "cancelled" : "failed";
        const done = await tx.jobFile.count({
          where: { jobId: id, status: "succeeded" },
        });
        const stopped = await tx.job.updateMany({
          where: {
            id,
            leaseOwner: owner,
            leaseVersion: version,
            status: { in: ACTIVE_STATUSES },
          },
          data: {
            status,
            done,
            errorCode: code,
            finishedAt: new Date(),
            leaseExpiresAt: null,
          },
        });
        if (!stopped.count) return;
        await tx.project.update({
          where: { id: initial.projectId },
          data: { status },
        });
        if (code === "ACCOUNT_SUSPENDED" || code === "CANCELLED")
          await refundUnusedJobQuota(
            tx,
            initial.userId,
            id,
            code === "CANCELLED"
              ? "cancelled_before_output"
              : "suspended_before_output",
          );
        await tx.auditEvent.create({
          data: {
            userId: initial.userId,
            action: `job.${status}`,
            resourceId: id,
            errorCode: code,
          },
        });
      });
    console.error(JSON.stringify({ event: "job.stopped", jobId: id, code }));
  } finally {
    clearInterval(timer);
  }
}

export function runtimeSecrets() {
  const env = getEnv();
  return [
    env.NINEROUTER_API_KEY,
    env.BETTER_AUTH_SECRET,
    env.GOOGLE_CLIENT_SECRET,
    env.DUITKU_API_KEY,
    env.RESEND_API_KEY,
    env.TURNSTILE_SECRET_KEY,
    env.REFERENCE_S3_ACCESS_KEY,
    env.REFERENCE_S3_SECRET_KEY,
  ].filter((value): value is string => Boolean(value));
}
