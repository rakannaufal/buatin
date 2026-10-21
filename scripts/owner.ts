import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hashPassword } from "better-auth/crypto";
import { createAuth } from "../src/server/auth";
import { db } from "../src/server/db";
import { getEnv } from "../src/server/config";
const mode = process.argv[2];
if (!["create", "reset"].includes(mode))
  throw new Error("Use create or reset.");
const email = getEnv().OWNER_EMAIL;
let password: string;
if (process.argv.includes("--generate")) {
  password = randomBytes(24).toString("base64url");
  await mkdir(".local", { recursive: true });
  await writeFile(".local/owner-password", password + "\n", { mode: 0o600 });
} else {
  if (!process.stdin.isTTY)
    throw new Error(
      "Interactive terminal required; use --generate for a private generated password file.",
    );
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const readline = createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });
  process.stdout.write(`Password for ${email} (min. 12 chars): `);
  muted = true;
  password = await readline.question("");
  readline.close();
  process.stdout.write("\n");
}
if (password.length < 12 || password.length > 128)
  throw new Error("Password must contain 12-128 characters.");
try {
  const existing = await db.user.findUnique({ where: { email } });
  if (mode === "create") {
    if (existing) throw new Error("Owner exists; use reset.");
    const result = await createAuth(true).api.signUpEmail({
      body: { email, password, name: "Pemilik" },
    });
    await db.user.update({
      where: { id: result.user.id },
      data: { role: "owner", emailVerified: true },
    });
  } else {
    if (!existing) throw new Error("Owner not found.");
    await db.$transaction([
      db.account.updateMany({
        where: { userId: existing.id, providerId: "credential" },
        data: { password: await hashPassword(password) },
      }),
      db.session.deleteMany({ where: { userId: existing.id } }),
    ]);
  }
  console.log(
    `Owner ${mode === "create" ? "created" : "password reset"}: ${email}. ${process.argv.includes("--generate") ? "Password saved in .local/owner-password (private)." : ""}`,
  );
} finally {
  await db.$disconnect();
}
