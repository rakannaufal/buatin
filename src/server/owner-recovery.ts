import { randomUUID } from "node:crypto";
import { db, type Transaction } from "./db";

export async function manageOwner(
  mode: "create" | "reset",
  email: string,
  passwordHash: string,
  client: Pick<typeof db, "$transaction"> = db,
) {
  return client.$transaction(async (tx: Transaction) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70421022)`;
    let user = await tx.user.findUnique({ where: { email } });
    if (mode === "create") {
      if (user || (await tx.user.count({ where: { role: "owner" } })))
        throw new Error(
          "Initial owner already exists. Use owner recovery or audited staff invitations.",
        );
      user = await tx.user.create({
        data: {
          id: randomUUID(),
          email,
          name: "Pemilik",
          role: "owner",
          emailVerified: true,
        },
      });
    } else if (!user || user.role !== "owner" || user.status !== "active") {
      throw new Error(
        "Recovery requires an existing active owner; it cannot promote or reactivate users.",
      );
    }
    const account = await tx.account.findFirst({
      where: { userId: user.id, providerId: "credential" },
    });
    if (account)
      await tx.account.update({
        where: { id: account.id },
        data: { password: passwordHash },
      });
    else
      await tx.account.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: passwordHash,
        },
      });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.verification.deleteMany({ where: { value: user.id } });
    await tx.user.update({
      where: { id: user.id },
      data: { accessVersion: { increment: 1 } },
    });
    await tx.auditEvent.create({
      data: {
        userId: user.id,
        action: `security.owner.${mode}`,
        targetType: "user",
        resourceId: user.id,
        reason:
          "Operator recovery via database-authorized CLI; existing MFA retained.",
      },
    });
    return { id: user.id };
  });
}
