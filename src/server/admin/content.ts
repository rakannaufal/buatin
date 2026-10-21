import type { NextRequest } from "next/server";
import { z } from "zod";
import { db, type Transaction } from "../db";
import { hash } from "../limits";
import { AppError } from "../errors";
import { catalog } from "../../domain/catalog";
import { skillCatalog } from "../../domain/skills";
import { hasSecret } from "../../domain/lint";
import { hasBinaryCharacters } from "../../domain/text";
import { reasonSchema, versionSchema } from "../../domain/admin";
import type { ProjectContext } from "../../domain/project-context";
import {
  adminMutation,
  adminReply,
  audit,
  conflict,
  type Operator,
} from "./security";

export async function applyPublishedSkills(
  context: ProjectContext,
  tx: Transaction = db,
) {
  const entries = await tx.contentVersion.findMany({
    where: {
      kind: "skill",
      key: { in: context.skills.map((s) => s.id) },
      status: "published",
    },
  });
  if (entries.some((entry) => hash(entry.content) !== entry.checksum))
    throw new AppError("CONTENT_UNAVAILABLE", 503);
  return {
    ...context,
    skills: context.skills.map((skill) => {
      const entry = entries.find((e) => e.key === skill.id);
      return entry
        ? {
            ...skill,
            guidance: entry.content,
            version: `admin-${entry.version}`,
            checksum: entry.checksum,
            source: entry.source,
            license: entry.license,
          }
        : skill;
    }),
  };
}
export async function publishedTemplates(tx: Transaction = db) {
  const entries = await tx.contentVersion.findMany({
    where: { kind: "template", status: "published" },
  });
  if (entries.some((entry) => hash(entry.content) !== entry.checksum))
    throw new AppError("CONTENT_UNAVAILABLE", 503);
  return Object.fromEntries(entries.map((entry) => [entry.key, entry.content]));
}
export async function contentApi(
  req: NextRequest,
  actor: Operator,
  segments: string[],
  body: () => Promise<unknown>,
) {
  const [, section, id, action] = segments;
  if (section !== "content") return null;
  if (req.method === "GET")
    return adminReply({
      items: await db.contentVersion.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      templates: catalog.map((entry) => ({
        key: entry.path,
        name: entry.title,
      })),
      skills: skillCatalog
        .filter((entry) => entry.status === "ready" && !entry.required)
        .map((entry) => ({ key: entry.id, name: entry.name })),
    });
  if (req.method !== "POST") return null;
  if (!id) {
    const input = z
      .object({
        kind: z.enum(["template", "skill"]),
        key: z.string().max(150),
        content: z.string().min(40).max(32000),
        source: z.string().trim().min(3).max(300),
        license: z.string().trim().min(3).max(100),
        reason: reasonSchema,
      })
      .strict()
      .parse(await body());
    if (
      (input.kind === "template" &&
        !catalog.some((entry) => entry.path === input.key)) ||
      (input.kind === "skill" &&
        !skillCatalog.some(
          (entry) =>
            entry.id === input.key &&
            entry.status === "ready" &&
            !entry.required,
        ))
    )
      throw new AppError(
        "CONTENT_KEY_INVALID",
        400,
        "Pilih template atau skill siap yang tersedia. Panduan keamanan wajib tidak dapat diganti.",
      );
    if (
      hasSecret(input.content) ||
      hasBinaryCharacters(input.content) ||
      Buffer.byteLength(input.content) > 32000 ||
      (input.kind === "template" && !/^# .+/m.test(input.content.slice(0, 200)))
    )
      throw new AppError(
        "CONTENT_UNSAFE",
        400,
        "Konten harus berupa Markdown/teks valid tanpa secret.",
      );
    return adminReply(
      await adminMutation(
        req,
        actor,
        "content",
        input,
        async (tx, requestId) => {
          const latest = await tx.contentVersion.findFirst({
            where: { kind: input.kind, key: input.key },
            orderBy: { version: "desc" },
          });
          const item = await tx.contentVersion.create({
            data: {
              kind: input.kind,
              key: input.key,
              content: input.content,
              source: input.source,
              license: input.license,
              version: (latest?.version ?? 0) + 1,
              checksum: hash(input.content),
              createdBy: actor.id,
            },
          });
          await audit(
            tx,
            actor,
            "content.drafted",
            "content",
            item.id,
            input.reason,
            undefined,
            {
              key: item.key,
              version: item.version,
              checksum: item.checksum,
              source: item.source,
              license: item.license,
            },
            requestId,
          );
          return { id: item.id };
        },
      ),
      201,
    );
  }
  const input = z
    .object({ version: versionSchema, reason: reasonSchema })
    .strict()
    .parse(await body());
  return adminReply(
    await adminMutation(req, actor, "content", input, async (tx, requestId) => {
      const prior = await tx.contentVersion.findUnique({ where: { id } });
      if (!prior) throw new AppError("NOT_FOUND", 404);
      if (prior.version !== input.version) conflict();
      if (action === "review") {
        if (
          prior.status !== "draft" ||
          hash(prior.content) !== prior.checksum ||
          hasSecret(prior.content)
        )
          throw new AppError("CONTENT_REVIEW_FAILED", 409);
        await tx.contentVersion.update({
          where: { id },
          data: { status: "reviewed", reviewedBy: actor.id },
        });
      } else if (action === "publish") {
        if (
          !["reviewed", "archived"].includes(prior.status) ||
          !prior.reviewedBy ||
          hash(prior.content) !== prior.checksum
        )
          throw new AppError(
            "CONTENT_REVIEW_REQUIRED",
            409,
            "Konten harus ditinjau sebelum publish/rollback.",
          );
        await tx.contentVersion.updateMany({
          where: { kind: prior.kind, key: prior.key, status: "published" },
          data: { status: "archived" },
        });
        await tx.contentVersion.update({
          where: { id },
          data: { status: "published", publishedAt: new Date() },
        });
      } else if (action === "unpublish") {
        if (prior.status !== "published") conflict();
        await tx.contentVersion.update({
          where: { id },
          data: { status: "archived" },
        });
      } else throw new AppError("NOT_FOUND", 404);
      await audit(
        tx,
        actor,
        `content.${action}`,
        "content",
        id,
        input.reason,
        { status: prior.status },
        { key: prior.key, version: prior.version, checksum: prior.checksum },
        requestId,
      );
      return { ok: true };
    }),
  );
}
