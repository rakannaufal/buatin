import type { NextRequest } from "next/server";
import { z } from "zod";
import { db, json } from "../db";
import { userLock, hash } from "../limits";
import { queueEmail } from "../email";
import { getEnv } from "../config";
import { AppError } from "../errors";
import { entitlementFor } from "../entitlements";
import {
  roles,
  reasonSchema,
  versionSchema,
  planFeatures,
  suspended,
} from "../../domain/admin";
import { controls } from "./policies";
import {
  adminReply,
  adminMutation,
  audit,
  conflict,
  createdFilter,
  listInput,
  pageSize,
  type Operator,
} from "./security";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  suspendedUntil: true,
  suspensionReason: true,
  emailVerified: true,
  twoFactorEnabled: true,
  createdAt: true,
  accessVersion: true,
} as const;
export async function usersApi(
  req: NextRequest,
  actor: Operator,
  segments: string[],
  body: () => Promise<unknown>,
) {
  const [, section, id, action, subId] = segments;
  if (section !== "users" && section !== "staff") return null;
  if (section === "users" && req.method === "GET") {
    if (!id) {
      const input = listInput(req);
      const now = new Date();
      const activePeriod = {
        planId: input.planId,
        revokedAt: null,
        startsAt: { lte: now },
        endsAt: { gt: now },
      };
      const where = {
        AND: [
          ...(input.q
            ? [
                {
                  OR: [
                    {
                      name: { contains: input.q, mode: "insensitive" as const },
                    },
                    {
                      email: {
                        contains: input.q,
                        mode: "insensitive" as const,
                      },
                    },
                    { id: input.q },
                  ],
                },
              ]
            : []),
          ...(input.planId
            ? [
                {
                  OR: [
                    { subscriptions: { some: activePeriod } },
                    { entitlementGrants: { some: activePeriod } },
                  ],
                },
              ]
            : []),
          ...(input.status === "suspended"
            ? [
                {
                  status: "suspended",
                  OR: [
                    { suspendedUntil: null },
                    { suspendedUntil: { gt: now } },
                  ],
                },
              ]
            : []),
          ...(input.status === "active"
            ? [
                {
                  OR: [
                    { status: "active" },
                    { status: "suspended", suspendedUntil: { lte: now } },
                  ],
                },
              ]
            : []),
        ],
        ...createdFilter(input),
        ...(input.verified ? { emailVerified: input.verified === "true" } : {}),
        ...(roles.includes(input.role as (typeof roles)[number])
          ? { role: input.role }
          : {}),
      };
      const [items, total] = await Promise.all([
        db.user.findMany({
          where,
          select: userSelect,
          skip: (input.page - 1) * pageSize,
          take: pageSize,
          orderBy: { createdAt: "desc" },
        }),
        db.user.count({ where }),
      ]);
      return adminReply({ items, total, page: input.page });
    }
    const user = await db.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user) throw new AppError("NOT_FOUND", 404);
    const [entitlement, sessions, payments, jobs, grants, credits] =
      await Promise.all([
        entitlementFor(id),
        db.session.findMany({
          where: { userId: id, expiresAt: { gt: new Date() } },
          select: {
            id: true,
            createdAt: true,
            expiresAt: true,
            userAgent: true,
          },
          take: 50,
          orderBy: { createdAt: "desc" },
        }),
        db.payment.findMany({
          where: { userId: id },
          select: {
            id: true,
            amount: true,
            status: true,
            planName: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }),
        db.job.findMany({
          where: { userId: id },
          select: {
            id: true,
            status: true,
            done: true,
            total: true,
            errorCode: true,
            createdAt: true,
          },
          take: 20,
          orderBy: { createdAt: "desc" },
        }),
        db.entitlementGrant.findMany({
          where: { userId: id },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
        db.creditGrant.findMany({
          where: { userId: id },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
      ]);
    return adminReply({
      user,
      entitlement,
      sessions,
      payments,
      jobs,
      grants,
      credits,
    });
  }
  if (section === "staff" && req.method === "GET") {
    if (actor.role !== "owner") throw new AppError("FORBIDDEN", 403);
    return adminReply({
      items: await db.user.findMany({
        where: { role: { in: ["admin", "owner"] } },
        select: userSelect,
        take: 100,
        orderBy: { createdAt: "asc" },
      }),
      invitations: await db.adminInvitation.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          expiresAt: true,
        },
        take: 100,
        orderBy: { createdAt: "desc" },
      }),
    });
  }
  if (section === "staff" && !id && req.method === "POST") {
    const input = z
      .object({
        email: z.email().transform((v) => v.toLowerCase()),
        reason: reasonSchema,
      })
      .strict()
      .parse(await body());
    return adminReply(
      await adminMutation(req, actor, "staff", input, async (tx, requestId) => {
        const token = crypto.randomUUID() + crypto.randomUUID();
        await tx.adminInvitation.updateMany({
          where: { email: input.email, status: "pending" },
          data: { status: "revoked" },
        });
        const invite = await tx.adminInvitation.create({
          data: {
            email: input.email,
            invitedBy: actor.id,
            tokenHash: hash(token),
            expiresAt: new Date(Date.now() + 86400000),
          },
        });
        await queueEmail(
          input.email,
          "Undangan admin Bantuin",
          `Masuk/daftar dengan email ini, lalu terima undangan di ${getEnv().APP_URL}/account?invitation=${token}\nBerlaku 24 jam. MFA wajib untuk operator pada domain publik.`,
          `admin-invite:${invite.id}`,
          tx,
        );
        await audit(
          tx,
          actor,
          "staff.invited",
          "invitation",
          invite.id,
          input.reason,
          undefined,
          { email: input.email, role: "admin" },
          requestId,
        );
        return { id: invite.id };
      }),
      201,
    );
  }
  if (
    section === "staff" &&
    id &&
    action === "revoke" &&
    req.method === "POST"
  ) {
    const input = z
      .object({ reason: reasonSchema })
      .strict()
      .parse(await body());
    return adminReply(
      await adminMutation(req, actor, "staff", input, async (tx, requestId) => {
        await tx.adminInvitation.updateMany({
          where: { id, status: "pending" },
          data: { status: "revoked" },
        });
        await audit(
          tx,
          actor,
          "staff.invitation.revoked",
          "invitation",
          id,
          input.reason,
          undefined,
          undefined,
          requestId,
        );
        return { ok: true };
      }),
    );
  }
  if (!id || req.method !== "POST") return null;
  if (section === "staff" && action === "role") {
    const input = z
      .object({
        role: z.enum(roles),
        version: versionSchema,
        reason: reasonSchema,
      })
      .strict()
      .parse(await body());
    return adminReply(
      await adminMutation(req, actor, "staff", input, async (tx, requestId) => {
        const target = await tx.user.findUnique({
          where: { id },
          select: userSelect,
        });
        if (!target) throw new AppError("NOT_FOUND", 404);
        if (target.accessVersion !== input.version) conflict();
        if (
          target.role === "owner" &&
          input.role !== "owner" &&
          (await tx.user.count({
            where: { role: "owner", status: "active" },
          })) <= 1
        )
          throw new AppError(
            "LAST_OWNER",
            409,
            "Owner terakhir tidak dapat diturunkan.",
          );
        if (input.role !== "user" && suspended({ ...target }))
          throw new AppError("STAFF_SUSPENDED", 409);
        if (input.role !== "user" && !target.emailVerified)
          throw new AppError("EMAIL_UNVERIFIED", 409);
        if (
          input.role !== "user" &&
          getEnv().ADMIN_REQUIRE_2FA === "true" &&
          !new URL(getEnv().APP_URL).hostname.match(
            /^(localhost|127\.0\.0\.1|\[::1\])$/,
          ) &&
          !target.twoFactorEnabled
        )
          throw new AppError("ADMIN_2FA_REQUIRED", 409);
        await tx.user.update({
          where: { id },
          data: { role: input.role, accessVersion: { increment: 1 } },
        });
        await tx.session.deleteMany({ where: { userId: id } });
        await audit(
          tx,
          actor,
          "staff.role.changed",
          "user",
          id,
          input.reason,
          { role: target.role },
          { role: input.role },
          requestId,
        );
        return { ok: true };
      }),
    );
  }
  if (section !== "users") return null;
  const input = z
    .object({
      reason: reasonSchema,
      version: versionSchema,
      until: z.iso.datetime().nullable().optional(),
      planId: z.enum(["starter", "plus", "max"]).optional(),
      days: z.number().int().min(1).max(365).optional(),
      amount: z.number().int().min(1).max(1000).optional(),
      sessionId: z.string().max(128).optional(),
    })
    .strict()
    .parse(await body());
  return adminReply(
    await adminMutation(
      req,
      actor,
      "users",
      { ...input, action, subId },
      async (tx, requestId) => {
        await userLock(tx, id);
        const target = await tx.user.findUnique({
          where: { id },
          select: userSelect,
        });
        if (!target) throw new AppError("NOT_FOUND", 404);
        if (target.accessVersion !== input.version) conflict();
        if (target.role !== "user" || target.id === actor.id)
          throw new AppError(
            "STAFF_PROTECTED",
            403,
            "Kelola role staf melalui halaman Staf; akun operator tidak dapat disuspend di sini.",
          );
        if (action === "suspend" || action === "restore") {
          const until = input.until ? new Date(input.until) : null;
          if (action === "suspend" && until && until <= new Date())
            throw new AppError("INVALID_PERIOD", 400);
          await tx.user.update({
            where: { id },
            data: {
              status: action === "suspend" ? "suspended" : "active",
              suspendedUntil: action === "suspend" ? until : null,
              suspensionReason: action === "suspend" ? input.reason : null,
              accessVersion: { increment: 1 },
            },
          });
          await tx.session.deleteMany({ where: { userId: id } });
        } else if (action === "sessions") {
          await tx.session.deleteMany({
            where: {
              userId: id,
              ...(input.sessionId ? { id: input.sessionId } : {}),
            },
          });
        } else if (action === "access") {
          const policy = await controls(tx);
          const days = input.days ?? 0;
          if (
            !input.planId ||
            !days ||
            (actor.role !== "owner" && days > policy.adminGrantDays)
          )
            throw new AppError(
              "GRANT_LIMIT",
              403,
              "Durasi grant melebihi izin operator.",
            );
          if (actor.role !== "owner") {
            const dayStart = new Date(new Date().toISOString().slice(0, 10));
            const grants = await tx.entitlementGrant.findMany({
              where: { createdBy: actor.id, createdAt: { gte: dayStart } },
              select: { startsAt: true, endsAt: true },
            });
            const usedDays = grants.reduce(
              (sum, grant) =>
                sum +
                Math.ceil(
                  (grant.endsAt.getTime() - grant.startsAt.getTime()) /
                    86400000,
                ),
              0,
            );
            if (usedDays + days > policy.adminGrantDays)
              throw new AppError(
                "GRANT_LIMIT",
                403,
                "Batas kumulatif durasi grant harian operator tercapai (UTC).",
              );
          }
          if (
            await tx.payment.count({
              where: {
                userId: id,
                status: { in: ["creating", "pending", "review"] },
              },
            })
          )
            throw new AppError(
              "PAYMENT_PENDING",
              409,
              "Selesaikan invoice tertunda sebelum memberi grant.",
            );
          const plan = await tx.billingPlan.findUniqueOrThrow({
            where: { id: input.planId },
          });
          const [paid, grant] = await Promise.all([
            tx.subscription.findFirst({
              where: {
                userId: id,
                revokedAt: null,
                endsAt: { gt: new Date() },
              },
              orderBy: { endsAt: "desc" },
            }),
            tx.entitlementGrant.findFirst({
              where: {
                userId: id,
                revokedAt: null,
                endsAt: { gt: new Date() },
              },
              orderBy: { endsAt: "desc" },
            }),
          ]);
          const startsAt = new Date(
            Math.max(
              Date.now(),
              paid?.endsAt.getTime() ?? 0,
              grant?.endsAt.getTime() ?? 0,
            ),
          );
          const created = await tx.entitlementGrant.create({
            data: {
              userId: id,
              planId: plan.id,
              planName: plan.name,
              planVersion: plan.version,
              weeklyQuota: plan.weeklyQuota,
              retentionDays: plan.retentionDays,
              priority: plan.priority,
              plannerLimit:
                plan.plannerLimit ?? Math.min(120, plan.weeklyQuota * 4),
              features: json(planFeatures(input.planId, plan.features)),
              startsAt,
              endsAt: new Date(startsAt.getTime() + days * 86400000),
              createdBy: actor.id,
              reason: input.reason,
            },
          });
          await audit(
            tx,
            actor,
            "user.access.granted",
            "grant",
            created.id,
            input.reason,
            undefined,
            { userId: id, planId: plan.id, startsAt, endsAt: created.endsAt },
            requestId,
          );
          return { id: created.id };
        } else if (action === "credits") {
          const policy = await controls(tx);
          if (
            !input.amount ||
            !input.days ||
            (actor.role !== "owner" &&
              (input.amount > policy.adminCreditLimit ||
                input.days > policy.adminGrantDays))
          )
            throw new AppError(
              "GRANT_LIMIT",
              403,
              "Jumlah/durasi kredit melebihi izin operator.",
            );
          if (actor.role !== "owner") {
            const dayStart = new Date(new Date().toISOString().slice(0, 10));
            const issued = await tx.creditGrant.aggregate({
              where: { createdBy: actor.id, createdAt: { gte: dayStart } },
              _sum: { amount: true },
            });
            if (
              (issued._sum.amount ?? 0) + input.amount >
              policy.adminCreditLimit
            )
              throw new AppError(
                "GRANT_LIMIT",
                403,
                "Batas kumulatif kredit harian operator tercapai (UTC).",
              );
          }
          const created = await tx.creditGrant.create({
            data: {
              userId: id,
              amount: input.amount,
              expiresAt: new Date(Date.now() + input.days * 86400000),
              createdBy: actor.id,
              reason: input.reason,
            },
          });
          await audit(
            tx,
            actor,
            "user.credits.granted",
            "credit",
            created.id,
            input.reason,
            undefined,
            { userId: id, amount: input.amount, expiresAt: created.expiresAt },
            requestId,
          );
          return { id: created.id };
        } else if (
          (action === "revoke-access" || action === "revoke-credit") &&
          subId
        ) {
          const where = { id: subId, userId: id, revokedAt: null };
          const changed =
            action === "revoke-access"
              ? await tx.entitlementGrant.updateMany({
                  where,
                  data: { revokedAt: new Date() },
                })
              : await tx.creditGrant.updateMany({
                  where,
                  data: { revokedAt: new Date() },
                });
          if (!changed.count) throw new AppError("NOT_FOUND", 404);
        } else throw new AppError("NOT_FOUND", 404);
        await audit(
          tx,
          actor,
          `user.${action}`,
          "user",
          id,
          input.reason,
          { status: target.status, accessVersion: target.accessVersion },
          { until: input.until, sessionId: input.sessionId, grantId: subId },
          requestId,
        );
        return { ok: true };
      },
    ),
  );
}
