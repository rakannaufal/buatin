import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "../db";
import { hash } from "../limits";
import { AppError } from "../errors";
import { checkOperatorMfa } from "../operator-access";
import { usersApi } from "./users";
import { commercialApi } from "./commercial";
import { operationsAdminApi } from "./operations";
import { financeApi } from "./finance";
import { contentApi } from "./content";
import { supportApi } from "./support";
import { reportsApi } from "./reports";
import { adminReply, allow, reauthenticate, type Operator } from "./security";

export async function adminApi(
  req: NextRequest,
  actor: Operator,
  segments: string[],
  body: () => Promise<unknown>,
) {
  allow(actor, "read");
  checkOperatorMfa(actor);
  const [, section] = segments;
  if (section === "reauth" && req.method === "POST")
    return adminReply(await reauthenticate(req, actor, await body()));
  if (section === "identity" && req.method === "GET") {
    const session = await db.session.findUnique({
      where: { id: actor.sessionId },
      select: { reauthUntil: true },
    });
    return adminReply({
      role: actor.role,
      userId: actor.id,
      twoFactorEnabled: actor.twoFactorEnabled,
      reauthUntil: session?.reauthUntil,
      unlocked: Boolean(
        session?.reauthUntil && session.reauthUntil > new Date(),
      ),
    });
  }
  if (section === "support")
    return supportApi(req, actor.id, segments, body, actor);
  for (const handler of [
    usersApi,
    commercialApi,
    financeApi,
    operationsAdminApi,
    contentApi,
    reportsApi,
  ]) {
    const response = await handler(req, actor, segments, body);
    if (response) return response;
  }
  // The existing overview/health remains read-only; no legacy mutation can bypass new permissions.
  if (req.method === "GET" && (!section || section === "operations"))
    return null;
  throw new AppError("NOT_FOUND", 404);
}
export async function acceptInvitation(
  user: { id: string; email: string; twoFactorEnabled: boolean },
  input: unknown,
) {
  const value = z
    .object({ token: z.string().min(32).max(128) })
    .strict()
    .parse(input);
  checkOperatorMfa(user);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70421022)`;
    const invitation = await tx.adminInvitation.findUnique({
      where: { tokenHash: hash(value.token) },
    });
    if (
      !invitation ||
      invitation.status !== "pending" ||
      invitation.email !== user.email.toLowerCase() ||
      invitation.expiresAt <= new Date()
    )
      throw new AppError(
        "INVITATION_INVALID",
        403,
        "Undangan tidak berlaku untuk akun ini.",
      );
    const owner = await tx.user.findFirst({
      where: { id: invitation.invitedBy, role: "owner", status: "active" },
    });
    const target = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!owner || target.role !== "user" || target.status !== "active")
      throw new AppError("INVITATION_INVALID", 403);
    await tx.user.update({
      where: { id: user.id },
      data: { role: "admin", accessVersion: { increment: 1 } },
    });
    await tx.adminInvitation.update({
      where: { id: invitation.id },
      data: { status: "accepted", acceptedBy: user.id },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.auditEvent.create({
      data: {
        userId: user.id,
        action: "staff.invitation.accepted",
        targetType: "invitation",
        resourceId: invitation.id,
        after: { role: "admin" },
      },
    });
    return { ok: true };
  });
}
