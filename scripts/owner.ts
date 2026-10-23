import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdir, open } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { hashPassword } from "better-auth/crypto";
import { manageOwner } from "../src/server/owner-recovery";
import { db } from "../src/server/db";
import { getEnv } from "../src/server/config";
const mode = process.argv[2];
if (!["create", "reset"].includes(mode))
  throw new Error("Use create or reset.");
if (process.argv.slice(3).some((arg) => arg !== "--generate"))
  throw new Error(
    "Password arguments are forbidden. Use the interactive prompt or --generate.",
  );
const email = getEnv().OWNER_EMAIL;
let password: string;
if (process.argv.includes("--generate")) {
  password = randomBytes(24).toString("base64url");
  await mkdir(".local", { recursive: true });
  const file = await open(".local/owner-password", "wx", 0o600);
  try {
    await file.writeFile(password + "\n");
  } finally {
    await file.close();
  }
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
  await manageOwner(
    mode as "create" | "reset",
    email,
    await hashPassword(password),
  );
  console.log(
    `Owner ${mode === "create" ? "created" : "password reset"}: ${email}. ${process.argv.includes("--generate") ? "Password saved in .local/owner-password (private)." : ""}`,
  );
} finally {
  await db.$disconnect();
}
