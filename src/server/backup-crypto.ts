import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { readFile, stat, open, appendFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

const magic = Buffer.from("BUATIN-BACKUP-1\n");
export async function backupKey(file: string) {
  const info = await stat(file);
  if ((info.mode & 0o077) !== 0)
    throw new Error("Backup key must have mode 0600.");
  const value = (await readFile(file, "utf8")).trim();
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value)
    throw new Error("Backup key must be 32 random bytes encoded as base64.");
  return key;
}
export async function fileHash(file: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
export async function encryptBackup(
  input: string,
  output: string,
  key: Buffer,
  context: string,
) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context));
  const handle = await open(output, "wx", 0o600);
  await handle.writeFile(Buffer.concat([magic, iv]));
  await handle.close();
  await pipeline(
    createReadStream(input),
    cipher,
    createWriteStream(output, { flags: "r+", start: magic.length + iv.length }),
  );
  await appendFile(output, cipher.getAuthTag());
}
export async function decryptBackup(
  input: string,
  output: string,
  key: Buffer,
  context: string,
) {
  const size = (await stat(input)).size;
  if (size < magic.length + 12 + 16)
    throw new Error("Invalid encrypted backup.");
  const file = await open(input, "r");
  const header = Buffer.alloc(magic.length + 12),
    tag = Buffer.alloc(16);
  try {
    await file.read(header, 0, header.length, 0);
    await file.read(tag, 0, 16, size - 16);
  } finally {
    await file.close();
  }
  if (!header.subarray(0, magic.length).equals(magic))
    throw new Error("Unsupported backup format.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    header.subarray(magic.length),
  );
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(tag);
  await pipeline(
    createReadStream(input, { start: header.length, end: size - 17 }),
    decipher,
    createWriteStream(output, { flags: "wx", mode: 0o600 }),
  );
}
