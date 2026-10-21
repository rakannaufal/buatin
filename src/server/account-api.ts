import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "./db";
import { AppError } from "./errors";
import { rateLimit } from "./limits";
type Session = { user: { id: string; email: string }; session: { id: string } };
const reply = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function accountApi(
  req: NextRequest,
  session: Session,
  segments: string[],
  body: () => Promise<unknown>,
) {
  const [resource, action, id] = segments;
  if (resource !== "account" || !action) return null;
  if (action === "sessions" && req.method === "GET" && !id) {
    const sessions = await db.session.findMany({
      where: { userId: session.user.id, expiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, expiresAt: true, userAgent: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return reply({
      sessions: sessions.map((entry) => ({
        ...entry,
        current: entry.id === session.session.id,
      })),
    });
  }
  if (action === "sessions" && req.method === "DELETE" && id) {
    const result = await db.session.deleteMany({
      where: { id, userId: session.user.id },
    });
    if (!result.count) throw new AppError("NOT_FOUND", 404);
    await db.auditEvent.create({
      data: {
        userId: session.user.id,
        action: "account.session.revoked",
        resourceId: id,
      },
    });
    return reply({ ok: true, current: id === session.session.id });
  }
  if (action === "data-requests" && !id) {
    if (req.method === "GET")
      return reply({
        requests: await db.dataRequest.findMany({
          where: { userId: session.user.id },
          select: {
            id: true,
            kind: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
      });
    if (req.method === "POST") {
      const input = z
        .object({
          kind: z.enum(["export", "deletion"]),
          confirmation: z.string().max(254),
        })
        .parse(await body());
      if (input.confirmation !== session.user.email)
        throw new AppError(
          "CONFIRMATION_REQUIRED",
          400,
          "Ketik email akun untuk mengonfirmasi permintaan.",
        );
      await rateLimit(`privacy:${session.user.id}`, 3, 86400);
      const request = await db.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${session.user.id}))`;
        const existing = await tx.dataRequest.findFirst({
          where: {
            userId: session.user.id,
            kind: input.kind,
            status: { in: ["open", "processing"] },
          },
        });
        return (
          existing ??
          tx.dataRequest.create({
            data: { userId: session.user.id, kind: input.kind },
          })
        );
      });
      return reply(
        {
          request: {
            id: request.id,
            kind: request.kind,
            status: request.status,
          },
        },
        202,
      );
    }
  }
  return null;
}
