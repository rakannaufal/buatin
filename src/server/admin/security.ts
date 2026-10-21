import type { NextRequest } from "next/server";
import { z } from "zod";
import { db, json, type Transaction } from "../db";
import { auth } from "../auth";
import { AppError } from "../errors";
import { hash, rateLimit } from "../limits";
import { checkOperatorMfa } from "../operator-access";
import { permitted, suspended, type Permission } from "../../domain/admin";
import { redactAudit, redactText } from "../../domain/audit";

export type Operator = {
  id: string;
  role: string;
  sessionId: string;
  twoFactorEnabled: boolean;
  requestId?: string;
};
export const adminReply = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function activeUser(id: string, tx: Transaction = db) {
  const user = await tx.user.findUnique({ where: { id } });
  if (!user || suspended(user))
    throw new AppError(
      "ACCOUNT_SUSPENDED",
      403,
      "Akun dibatasi. Hubungi bantuan untuk peninjauan.",
    );
  return user;
}
export function allow(actor: Operator, permission: Permission) {
  if (!permitted(actor.role, permission))
    throw new AppError(
      "FORBIDDEN",
      403,
      "Tindakan ini tidak diizinkan untuk role Anda.",
    );
}
export async function reauthenticate(
  req: NextRequest,
  actor: Operator,
  body: unknown,
) {
  await rateLimit(`admin-reauth:${actor.id}`, 5, 300);
  const input = z
    .object({
      password: z.string().min(1).max(128),
      code: z
        .string()
        .regex(/^\d{6}$/)
        .optional(),
    })
    .strict()
    .parse(body);
  try {
    await auth.api.verifyPassword({
      headers: req.headers,
      body: { password: input.password },
    });
    if (actor.twoFactorEnabled) {
      if (!input.code) throw new Error("Second factor required");
      await auth.api.verifyTOTP({
        headers: req.headers,
        body: { code: input.code, trustDevice: false },
      });
    }
  } catch {
    await db.auditEvent.create({
      data: {
        userId: actor.id,
        action: "admin.reauthentication.failed",
        targetType: "session",
        resourceId: actor.sessionId,
        requestId: actor.requestId,
        result: "denied",
      },
    });
    throw new AppError(
      "REAUTH_FAILED",
      403,
      "Password atau kode autentikator tidak valid.",
    );
  }
  const until = new Date(Date.now() + 5 * 60000);
  await db.$transaction(async (tx) => {
    const current = await activeUser(actor.id, tx);
    allow({ ...actor, role: current.role }, "read");
    checkOperatorMfa(current);
    const changed = await tx.session.updateMany({
      where: {
        id: actor.sessionId,
        userId: actor.id,
        expiresAt: { gt: new Date() },
      },
      data: { reauthUntil: until },
    });
    if (!changed.count) throw new AppError("UNAUTHENTICATED", 401);
    await audit(
      tx,
      actor,
      "admin.reauthenticated",
      "session",
      actor.sessionId,
      "Operator verified credentials for temporary mutation access.",
      undefined,
      { until },
      actor.requestId,
    );
  });
  return { until };
}
export async function audit(
  tx: Transaction,
  actor: Operator,
  action: string,
  targetType: string,
  resourceId: string,
  reason: string,
  before?: unknown,
  after?: unknown,
  requestId?: string,
) {
  await tx.auditEvent.create({
    data: {
      userId: actor.id,
      action,
      targetType,
      resourceId,
      reason: redactText(reason),
      ...(before === undefined ? {} : { before: json(redactAudit(before)) }),
      ...(after === undefined ? {} : { after: json(redactAudit(after)) }),
      requestId,
    },
  });
}
export async function adminMutation<T>(
  req: NextRequest,
  actor: Operator,
  permission: Permission,
  input: unknown,
  run: (tx: Transaction, requestId: string) => Promise<T>,
): Promise<T> {
  allow(actor, permission);
  await rateLimit(`admin-write:${actor.id}`, 60, 60);
  const key = z
    .string()
    .min(8)
    .max(128)
    .parse(req.headers.get("idempotency-key"));
  const operation = `${req.method}:${req.nextUrl.pathname}`;
  const requestHash = hash(JSON.stringify(input));
  return db.$transaction(
    async (tx) => {
      // Serializes staff/owner transitions and setting publication; checkout has its own narrower locks.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(70421022)`;
      const current = await activeUser(actor.id, tx);
      allow({ ...actor, role: current.role }, permission);
      checkOperatorMfa(current);
      const session = await tx.session.findFirst({
        where: {
          id: actor.sessionId,
          userId: actor.id,
          expiresAt: { gt: new Date() },
          reauthUntil: { gt: new Date() },
        },
      });
      if (!session)
        throw new AppError(
          "REAUTH_REQUIRED",
          403,
          "Verifikasi ulang password dan autentikator sebelum mengubah admin.",
        );
      const prior = await tx.adminMutation.findUnique({
        where: {
          userId_operation_keyHash: {
            userId: actor.id,
            operation,
            keyHash: hash(key),
          },
        },
      });
      if (prior) {
        if (prior.requestHash !== requestHash)
          throw new AppError(
            "IDEMPOTENCY_CONFLICT",
            409,
            "Kunci permintaan sudah dipakai untuk perubahan lain.",
          );
        return prior.response as T;
      }
      const response = await run(tx, actor.requestId ?? crypto.randomUUID());
      await tx.adminMutation.create({
        data: {
          userId: actor.id,
          operation,
          keyHash: hash(key),
          requestHash,
          response: json(response),
        },
      });
      return response;
    },
    { timeout: 15000 },
  );
}
export function conflict(): never {
  throw new AppError(
    "VERSION_CONFLICT",
    409,
    "Data berubah. Muat ulang sebelum menyimpan.",
  );
}
export function listInput(req: NextRequest) {
  const value = z
    .object({
      page: z.coerce.number().int().min(1).max(10000).default(1),
      q: z.string().trim().max(100).default(""),
      status: z.string().max(40).default(""),
      role: z.string().max(20).default(""),
      planId: z.string().max(20).default(""),
      verified: z.enum(["", "true", "false"]).default(""),
      from: z.union([z.iso.date(), z.literal("")]).default(""),
      to: z.union([z.iso.date(), z.literal("")]).default(""),
      voucher: z.string().trim().max(32).default(""),
    })
    .parse(Object.fromEntries(req.nextUrl.searchParams));
  if (value.from && value.to && value.from > value.to)
    throw new AppError(
      "INVALID_PERIOD",
      400,
      "Tanggal akhir harus sesudah tanggal awal.",
    );
  return value;
}
export function createdFilter(input: { from: string; to: string }) {
  return input.from || input.to
    ? {
        createdAt: {
          ...(input.from ? { gte: new Date(`${input.from}T00:00:00Z`) } : {}),
          ...(input.to ? { lte: new Date(`${input.to}T23:59:59.999Z`) } : {}),
        },
      }
    : {};
}
export const pageSize = 20;
