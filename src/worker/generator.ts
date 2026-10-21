import { db, json, type Transaction } from "../server/db";
import { applyCustomization } from "../domain/customization-output";
import { getEnv } from "../server/config";
import { AppError, errorCode } from "../server/errors";
import { callLlm, checkModels } from "../server/llm";
import { hash, userLock } from "../server/limits";
import { refundQuota } from "../server/entitlements";
import { activeUser } from "../server/admin/security";
import { suspended } from "../domain/admin";
import { lintOutput, manifestFor, type OutputFile } from "../domain/lint";
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
      if (candidate.llmRequestCount === 0)
        await refundQuota(tx, candidate.userId, id, "suspended_before_ai");
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
  const cancellation = new AbortController();
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
  const fenced = async (tx: Transaction) => {
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
  const cancelTimer = setInterval(() => {
    void check().catch((error) => cancellation.abort(error));
  }, 1000);
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
  const budget = (fileId: string) => async () => {
    await check();
    await db.$transaction(async (tx) => {
      await fenced(tx);
      const jobCount = await tx.job.updateMany({
        where: { ...fence, llmRequestCount: { lt: snapshot.maxRequests } },
        data: { llmRequestCount: { increment: 1 } },
      });
      const fileCount = await tx.jobFile.updateMany({
        where: {
          jobId: id,
          fileId,
          attempts: { lt: snapshot.maxFileRequests },
        },
        data: { attempts: { increment: 1 } },
      });
      if (!jobCount.count || !fileCount.count)
        throw new AppError("REQUEST_BUDGET", 409);
    });
  };
  try {
    await checkModels(snapshot.config);
    for (const selected of snapshot.plan.selected) {
      await check();
      const entry = snapshot.catalog.find((f) => f.id === selected.id)!;
      const file = await db.jobFile.findUniqueOrThrow({
        where: { jobId_fileId: { jobId: id, fileId: entry.id } },
      });
      if (file.status === "succeeded") continue;
      if (file.attempts >= snapshot.maxFileRequests) {
        await db.$transaction(async (tx) => {
          await fenced(tx);
          await tx.jobFile.update({
            where: { jobId_fileId: { jobId: id, fileId: entry.id } },
            data: { status: "failed", errorCode: "REQUEST_BUDGET" },
          });
        });
        continue;
      }
      const completed = await db.jobFile.findMany({ where: { jobId: id } });
      const relevant = entry.context_from.filter(
        (contextId) =>
          snapshot.plan.selected.some((f) => f.id === contextId) &&
          snapshot.catalog.find((f) => f.id === contextId)!.order < entry.order,
      );
      if (
        relevant.some(
          (contextId) =>
            ["brief", "prd", "architecture"].includes(contextId) &&
            completed.find((f) => f.fileId === contextId)?.status !==
              "succeeded",
        )
      ) {
        await db.$transaction(async (tx) => {
          await fenced(tx);
          await tx.jobFile.update({
            where: { jobId_fileId: { jobId: id, fileId: entry.id } },
            data: { status: "blocked", errorCode: "CONTEXT_UNAVAILABLE" },
          });
        });
        continue;
      }
      await db.$transaction(async (tx) => {
        await userLock(tx, initial.userId);
        await fenced(tx);
        await tx.jobFile.update({
          where: { jobId_fileId: { jobId: id, fileId: entry.id } },
          data: { status: "running", errorCode: null },
        });
      });
      try {
        const context = relevant.slice(0, 3).map((contextId) => ({
          id: contextId,
          content:
            completed
              .find((f) => f.fileId === contextId)
              ?.content?.slice(0, 10000) ?? "",
        }));
        const input = {
          task: "write",
          brief: snapshot.brief,
          briefBoundary: crypto.randomUUID(),
          webType: snapshot.webType,
          fileId: entry.id,
          path: entry.path,
          template: snapshot.templates[entry.id],
          plan: snapshot.plan.selected.map((f) => ({ id: f.id, path: f.path })),
          summary: snapshot.plan.summary,
          assumptions: snapshot.plan.assumptions,
          projectContext: snapshot.projectContext
            ? {
                ...snapshot.projectContext,
                skills: snapshot.projectContext.skills.filter((skill) =>
                  skill.documents.includes(entry.id),
                ),
              }
            : undefined,
          context,
        };
        const result = await callLlm(
          snapshot.config,
          "write",
          snapshot.writerPrompt,
          input,
          budget(entry.id),
          cancellation.signal,
          { userId: initial.userId, resourceId: id },
        );
        let content = result.content;
        if (result.finish_reason === "length") {
          const next = await callLlm(
            snapshot.config,
            "write",
            snapshot.writerPrompt,
            {
              ...input,
              continuation: true,
              lastText: content.slice(-2000),
              instruction:
                "Continue exactly where the previous output stopped; do not repeat content.",
            },
            budget(entry.id),
            cancellation.signal,
            { userId: initial.userId, resourceId: id },
          );
          if (!content.includes(next.content)) {
            let overlap = 0;
            for (
              let size = Math.min(content.length, next.content.length, 4000);
              size > 0;
              size--
            ) {
              if (content.endsWith(next.content.slice(0, size))) {
                overlap = size;
                break;
              }
            }
            content += next.content.slice(overlap);
          }
          result.finish_reason = next.finish_reason;
          result.tokens_in =
            result.tokens_in === null || next.tokens_in === null
              ? null
              : result.tokens_in + next.tokens_in;
          result.tokens_out =
            result.tokens_out === null || next.tokens_out === null
              ? null
              : result.tokens_out + next.tokens_out;
        }
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
        if (entry.id === "agents")
          content +=
            "\n## Urutan baca\n\n" +
            snapshot.plan.selected
              .filter((f) => f.id !== "agents")
              .map((f) => `- [${f.path}](${f.path})`)
              .join("\n") +
            "\n";
        content = applyCustomization(
          content,
          entry.id,
          snapshot.projectContext,
        );
        await check();
        const lint = lintOutput(
          [
            {
              id: entry.id,
              path: entry.path,
              content,
              finishReason: result.finish_reason,
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
              modelUsed: result.model_used,
              tokensIn: result.tokens_in,
              tokensOut: result.tokens_out,
              finishReason: result.finish_reason,
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
        if (
          [
            "CANCELLED",
            "ACCOUNT_SUSPENDED",
            "LEASE_LOST",
            "LLM_AUTH",
            "LLM_MODEL_MISSING",
            "REQUEST_BUDGET",
            "LLM_DAILY_LIMIT",
            "LLM_PRICING_REQUIRED",
          ].includes(code)
        )
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
    const repairCodes = new Set([
      "INVALID_MARKDOWN",
      "META_WRAPPER",
      "BROKEN_REFERENCE",
      "UNSAFE_LINK",
      "SECRET_DETECTED",
    ]);
    const initialIssues = lintOutput(outputs, runtimeSecrets());
    const repairNotes: LintIssue[] = [];
    const repairTargets = new Set(
      initialIssues
        .filter(
          (issue) =>
            repairCodes.has(issue.code) &&
            issue.fileId &&
            (issue.code !== "BROKEN_REFERENCE" ||
              outputs.length === initial.total),
        )
        .map((issue) => issue.fileId),
    );
    for (const file of outputs.filter((output) =>
      repairTargets.has(output.id),
    )) {
      await check();
      try {
        const result = await callLlm(
          snapshot.config,
          "fix",
          snapshot.writerPrompt,
          {
            task: "fix",
            fileId: file.id,
            path: file.path,
            content: file.content,
            brief: snapshot.brief,
            webType: snapshot.webType,
            projectContext: snapshot.projectContext
              ? {
                  ...snapshot.projectContext,
                  skills: snapshot.projectContext.skills.filter((skill) =>
                    skill.documents.includes(file.id),
                  ),
                }
              : undefined,
            issues: initialIssues.filter((issue) => issue.fileId === file.id),
            allowedPaths: outputs.map((output) => output.path),
            instruction:
              "Repair only the reported issues. Return the complete Markdown document. Do not invent test evidence.",
          },
          budget(file.id),
          cancellation.signal,
          { userId: initial.userId, resourceId: id },
        );
        file.content = applyCustomization(
          result.content,
          file.id,
          snapshot.projectContext,
        );
        file.finishReason = result.finish_reason;
        await db.$transaction(async (tx) => {
          await fenced(tx);
          await tx.jobFile.update({
            where: { jobId_fileId: { jobId: id, fileId: file.id } },
            data: {
              content: file.content,
              checksum: hash(file.content),
              finishReason: result.finish_reason,
              modelUsed: result.model_used,
              tokensIn: null,
              tokensOut: null,
            },
          });
        });
      } catch (error) {
        const code = errorCode(error);
        if (
          [
            "CANCELLED",
            "ACCOUNT_SUSPENDED",
            "LEASE_LOST",
            "REQUEST_BUDGET",
            "LLM_AUTH",
            "LLM_DAILY_LIMIT",
            "LLM_PRICING_REQUIRED",
          ].includes(code)
        )
          throw error;
        repairNotes.push({
          code: "REPAIR_FAILED",
          fileId: file.id,
          message:
            "Percobaan perbaikan otomatis belum berhasil; hasil asli perlu ditinjau.",
          severity: "warning",
          blocksExport: false,
        });
      }
    }
    const issues = [...lintOutput(outputs, runtimeSecrets()), ...repairNotes];
    const models = new Set(files.map((f) => f.modelUsed).filter(Boolean));
    if (models.size > 1)
      issues.push({
        code: "MODEL_CHANGED",
        message:
          "Model yang dilaporkan berbeda antar dokumen; alias tidak memastikan model upstream.",
        severity: "warning",
        blocksExport: false,
      });
    if (snapshot.promptVersion.endsWith("fallback"))
      issues.push({
        code: "FALLBACK_TEMPLATE",
        message:
          "Paket memakai kerangka template sementara. Tinjau sebelum digunakan.",
        severity: "warning",
        blocksExport: false,
      });
    if (snapshot.config.mock)
      issues.push({
        code: "MOCK_OUTPUT",
        message:
          "Mode mock: dokumen fixture pengujian, belum dihasilkan AI nyata.",
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
        if (
          ["LLM_AUTH", "LLM_MODEL_MISSING", "REQUEST_BUDGET"].includes(code) ||
          (code === "ACCOUNT_SUSPENDED" &&
            initial.llmRequestCount === 0 &&
            (await tx.job.findUniqueOrThrow({ where: { id } }))
              .llmRequestCount === 0) ||
          (code === "CANCELLED" &&
            initial.llmRequestCount === 0 &&
            (await tx.job.findUniqueOrThrow({ where: { id } }))
              .llmRequestCount === 0)
        ) {
          await refundQuota(
            tx,
            initial.userId,
            id,
            code === "CANCELLED"
              ? "cancelled_before_ai"
              : "permanent_system_failure",
          );
        }
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
    clearInterval(cancelTimer);
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
