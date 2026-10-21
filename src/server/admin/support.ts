import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "../db";
import { AppError } from "../errors";
import { hash, rateLimit, userLock } from "../limits";
import { reasonSchema, versionSchema } from "../../domain/admin";
import {
  adminMutation,
  adminReply,
  audit,
  conflict,
  listInput,
  pageSize,
  type Operator,
} from "./security";
const messageSchema = z.string().trim().min(8).max(3000);
export async function supportApi(
  req: NextRequest,
  userId: string,
  segments: string[],
  body: () => Promise<unknown>,
  actor?: Operator,
) {
  const id = actor ? segments[2] : segments[1];
  if (req.method === "GET") {
    if (id) {
      const messagePage = z.coerce
        .number()
        .int()
        .min(1)
        .max(10000)
        .parse(req.nextUrl.searchParams.get("messagesPage") ?? 1);
      const visible = actor ? {} : { internal: false };
      const ticket = await db.supportTicket.findFirst({
        where: { id, ...(actor ? {} : { userId }) },
        include: {
          messages: {
            where: visible,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: pageSize,
            skip: (messagePage - 1) * pageSize,
          },
          _count: { select: { messages: { where: visible } } },
        },
      });
      if (!ticket) throw new AppError("NOT_FOUND", 404);
      const { _count, messages, ...value } = ticket;
      return adminReply({
        ticket: {
          ...value,
          messages: messages.reverse(),
          messagePage,
          messageTotal: _count.messages,
        },
      });
    }
    const input = listInput(req);
    const where = {
      ...(actor ? {} : { userId }),
      ...(input.status ? { status: input.status } : {}),
      ...(input.q
        ? {
            OR: [
              { id: input.q },
              ...(actor ? [{ userId: input.q }] : []),
              { subject: { contains: input.q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      db.supportTicket.findMany({
        where,
        take: pageSize,
        skip: (input.page - 1) * pageSize,
        orderBy: { updatedAt: "desc" },
      }),
      db.supportTicket.count({ where }),
    ]);
    return adminReply({ items, total, page: input.page });
  }
  if (req.method !== "POST") return null;
  if (!actor) {
    await rateLimit(`support:${userId}`, 10, 3600);
    const input = z
      .object({
        subject: z.string().trim().min(5).max(150).optional(),
        message: messageSchema,
      })
      .strict()
      .parse(await body());
    const key = z
      .string()
      .min(8)
      .max(128)
      .parse(req.headers.get("idempotency-key"));
    const operation = `support:${id ?? "create"}`,
      requestHash = hash(JSON.stringify(input));
    const result = await db.$transaction(async (tx) => {
      await userLock(tx, userId);
      const receiptKey = { userId, operation, keyHash: hash(key) };
      const receipt = await tx.idempotencyKey.findUnique({
        where: { userId_operation_keyHash: receiptKey },
      });
      if (receipt) {
        if (receipt.requestHash !== requestHash)
          throw new AppError("IDEMPOTENCY_CONFLICT", 409);
        return id ? { ok: true } : { id: receipt.resourceId };
      }
      let resourceId: string;
      if (!id) {
        if (!input.subject) throw new AppError("SUBJECT_REQUIRED", 400);
        const ticket = await tx.supportTicket.create({
          data: {
            userId,
            subject: input.subject,
            messages: { create: { authorId: userId, body: input.message } },
          },
        });
        resourceId = ticket.id;
      } else {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`support:${id}`}))`;
        const ticket = await tx.supportTicket.findFirst({
          where: { id, userId },
        });
        if (!ticket) throw new AppError("NOT_FOUND", 404);
        if (ticket.status === "closed")
          throw new AppError("TICKET_CLOSED", 409);
        const message = await tx.supportMessage.create({
          data: { ticketId: id, authorId: userId, body: input.message },
        });
        resourceId = message.id;
        await tx.supportTicket.update({
          where: { id },
          data: { status: "open", version: { increment: 1 } },
        });
      }
      await tx.idempotencyKey.create({
        data: { ...receiptKey, requestHash, resourceId },
      });
      return id ? { ok: true } : { id: resourceId };
    });
    return adminReply(result, id ? 200 : 201);
  }
  if (!id) throw new AppError("NOT_FOUND", 404);
  const input = z
    .object({
      version: versionSchema,
      reason: reasonSchema,
      message: z.string().trim().max(3000).default(""),
      internal: z.boolean(),
      status: z.enum(["open", "waiting", "resolved", "closed"]),
      priority: z.enum(["low", "normal", "high"]),
      assignedTo: z.string().max(100).nullable(),
    })
    .strict()
    .parse(await body());
  return adminReply(
    await adminMutation(req, actor, "support", input, async (tx, requestId) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`support:${id}`}))`;
      const prior = await tx.supportTicket.findUnique({ where: { id } });
      if (!prior) throw new AppError("NOT_FOUND", 404);
      if (prior.version !== input.version) conflict();
      if (
        input.assignedTo &&
        !(await tx.user.findFirst({
          where: {
            id: input.assignedTo,
            role: { in: ["owner", "admin"] },
            status: "active",
          },
        }))
      )
        throw new AppError("ASSIGNEE_INVALID", 400);
      if (input.message)
        await tx.supportMessage.create({
          data: {
            ticketId: id,
            authorId: actor.id,
            body: input.message,
            internal: input.internal,
          },
        });
      await tx.supportTicket.update({
        where: { id },
        data: {
          status: input.status,
          priority: input.priority,
          assignedTo: input.assignedTo,
          version: { increment: 1 },
        },
      });
      await audit(
        tx,
        actor,
        "support.updated",
        "ticket",
        id,
        input.reason,
        { status: prior.status, priority: prior.priority },
        {
          status: input.status,
          priority: input.priority,
          internalMessage: input.internal && Boolean(input.message),
        },
        requestId,
      );
      return { ok: true };
    }),
  );
}
