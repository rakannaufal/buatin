import { afterAll, beforeAll, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { db } from "../../src/server/db";
import { manageOwner } from "../../src/server/owner-recovery";
const emails = [1, 2].map(
  () => `owner-recovery-fixture-${crypto.randomUUID()}@localhost.test`,
);
let ownerId = "",
  ownerEmail = "";
beforeAll(async () => {
  if (await db.user.count({ where: { role: "owner" } }))
    throw new Error(
      "Owner recovery fixture requires an isolated database without owners.",
    );
});
afterAll(async () => {
  const users = await db.user.findMany({
    where: { email: { in: emails } },
    select: { id: true },
  });
  await db.auditEvent.deleteMany({
    where: { userId: { in: users.map((user) => user.id) } },
  });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});
it("creates only one initial owner under concurrent operator requests", async () => {
  const hash = await hashPassword(randomBytes(24).toString("base64url"));
  const attempts = await Promise.allSettled(
    emails.map((email) => manageOwner("create", email, hash)),
  );
  expect(
    attempts.filter((attempt) => attempt.status === "fulfilled"),
  ).toHaveLength(1);
  const owner = await db.user.findFirstOrThrow({
    where: { email: { in: emails } },
  });
  ownerId = owner.id;
  ownerEmail = owner.email;
  expect(owner.role).toBe("owner");
  expect(
    await db.auditEvent.count({
      where: { userId: ownerId, action: "security.owner.create" },
    }),
  ).toBe(1);
});
it("resets only active owners, preserves MFA and revokes prior sessions atomically", async () => {
  await db.user.update({
    where: { id: ownerId },
    data: { twoFactorEnabled: true },
  });
  await db.session.create({
    data: {
      id: crypto.randomUUID(),
      token: randomBytes(32).toString("hex"),
      userId: ownerId,
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  const hash = await hashPassword(randomBytes(24).toString("base64url"));
  const version = (await db.user.findUniqueOrThrow({ where: { id: ownerId } }))
    .accessVersion;
  await manageOwner("reset", ownerEmail, hash);
  expect(await db.session.count({ where: { userId: ownerId } })).toBe(0);
  expect(
    await db.user.findUniqueOrThrow({ where: { id: ownerId } }),
  ).toMatchObject({ twoFactorEnabled: true, accessVersion: version + 1 });
  expect(
    await db.account.findFirstOrThrow({
      where: { userId: ownerId, providerId: "credential" },
    }),
  ).toMatchObject({ password: hash, accountId: ownerId });
  await db.user.update({ where: { id: ownerId }, data: { role: "user" } });
  await expect(manageOwner("reset", ownerEmail, hash)).rejects.toThrow(
    "existing active owner",
  );
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: ownerId } })).role,
  ).toBe("user");
});
