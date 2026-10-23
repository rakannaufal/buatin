import { createReadStream } from "node:fs";
import { readdir, lstat, mkdir, mkdtemp, open, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getEnv } from "./config";
import { fileHash } from "./backup-crypto";
import { db, json } from "./db";
import { z } from "zod";

const backupId = /^buatin-[0-9TZ-]+-[a-f0-9-]{36}$/;
const entryName =
  /^(?:envelope\.json|(?:manifest\.json|database\.dump|[a-f0-9-]{36}\.blob)\.enc)$/;
const completionSchema = z
  .object({
    version: z.literal(1),
    id: z.string().regex(backupId),
    completedAt: z.iso.datetime(),
    files: z
      .array(
        z
          .object({
            name: z.string().regex(entryName),
            bytes: z
              .number()
              .int()
              .positive()
              .max(10 * 1024 ** 3),
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
          })
          .strict(),
      )
      .min(3)
      .max(10000),
  })
  .strict();

function backupClient() {
  const env = getEnv();
  if (
    !env.BACKUP_S3_BUCKET ||
    !env.BACKUP_S3_ACCESS_KEY ||
    !env.BACKUP_S3_SECRET_KEY
  )
    throw new Error("Off-host backup storage is not configured.");
  if (
    env.BACKUP_S3_ENDPOINT &&
    new URL(env.BACKUP_S3_ENDPOINT).protocol !== "https:"
  )
    throw new Error("Off-host backup storage requires HTTPS.");
  return new S3Client({
    region: env.BACKUP_S3_REGION,
    ...(env.BACKUP_S3_ENDPOINT
      ? { endpoint: env.BACKUP_S3_ENDPOINT, forcePathStyle: true }
      : {}),
    credentials: {
      accessKeyId: env.BACKUP_S3_ACCESS_KEY,
      secretAccessKey: env.BACKUP_S3_SECRET_KEY,
    },
    maxAttempts: 2,
  });
}

export async function downloadBackup(
  id: string,
  destination: string,
  maxBytes = 10 * 1024 ** 3,
) {
  if (!backupId.test(id)) throw new Error("Invalid backup ID.");
  const env = getEnv();
  const client = backupClient();
  try {
    const completed = await client.send(
      new GetObjectCommand({
        Bucket: env.BACKUP_S3_BUCKET,
        Key: `backups/${id}/COMPLETE.json`,
      }),
      { abortSignal: AbortSignal.timeout(20000) },
    );
    if (!completed.Body)
      throw new Error("Backup completion receipt is missing.");
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of completed.Body as AsyncIterable<Uint8Array>) {
      size += chunk.byteLength;
      if (size > 1048576) throw new Error("Backup receipt is too large.");
      chunks.push(Buffer.from(chunk));
    }
    const receipt = completionSchema.parse(
      JSON.parse(Buffer.concat(chunks).toString("utf8")),
    );
    const names = new Set(receipt.files.map((file) => file.name));
    if (
      receipt.id !== id ||
      names.size !== receipt.files.length ||
      !["envelope.json", "manifest.json.enc", "database.dump.enc"].every(
        (name) => names.has(name),
      ) ||
      receipt.files.reduce((sum, file) => sum + file.bytes, 0) > maxBytes
    )
      throw new Error(
        "Invalid backup completion receipt or download limit exceeded.",
      );
    await mkdir(destination, { recursive: true, mode: 0o700 });
    const root = await mkdtemp(
      path.join(path.resolve(destination), "download-"),
    );
    const partial = path.join(root, `${id}.partial`);
    await mkdir(partial, { mode: 0o700 });
    for (const entry of receipt.files) {
      const stored = await client.send(
        new GetObjectCommand({
          Bucket: env.BACKUP_S3_BUCKET,
          Key: `backups/${id}/${entry.name}`,
        }),
        { abortSignal: AbortSignal.timeout(300000) },
      );
      if (!stored.Body) throw new Error("Archived backup cannot be read.");
      const handle = await open(path.join(partial, entry.name), "wx", 0o600);
      let bytes = 0;
      const digest = createHash("sha256");
      try {
        for await (const chunk of stored.Body as AsyncIterable<Uint8Array>) {
          bytes += chunk.byteLength;
          if (bytes > entry.bytes)
            throw new Error("Archived backup size mismatch.");
          digest.update(chunk);
          await handle.writeFile(chunk);
        }
      } finally {
        await handle.close();
      }
      if (bytes !== entry.bytes || digest.digest("hex") !== entry.sha256)
        throw new Error("Archived backup checksum mismatch.");
    }
    const directory = path.join(root, id);
    await rename(partial, directory);
    return { directory, files: receipt.files.length, verified: true };
  } finally {
    client.destroy();
  }
}

export async function archiveBackup(directory: string) {
  const env = getEnv();
  const id = path.basename(directory);
  if (!backupId.test(id)) throw new Error("Invalid backup ID.");
  const names = (await readdir(directory)).sort();
  if (
    !names.includes("envelope.json") ||
    !names.includes("manifest.json.enc") ||
    !names.includes("database.dump.enc") ||
    names.some((name) => !entryName.test(name))
  )
    throw new Error(
      "Only complete encrypted backup directories can be archived.",
    );
  const client = backupClient();
  const files: Array<{ name: string; bytes: number; sha256: string }> = [];
  try {
    for (const name of names) {
      const file = path.join(directory, name),
        info = await lstat(file),
        sha256 = await fileHash(file);
      if (!info.isFile())
        throw new Error("Backup entries must be regular files.");
      const key = `backups/${id}/${name}`;
      await client.send(
        new PutObjectCommand({
          Bucket: env.BACKUP_S3_BUCKET,
          Key: key,
          Body: createReadStream(file),
          ContentLength: info.size,
          ChecksumSHA256: Buffer.from(sha256, "hex").toString("base64"),
        }),
        { abortSignal: AbortSignal.timeout(300000) },
      );
      const stored = await client.send(
        new GetObjectCommand({ Bucket: env.BACKUP_S3_BUCKET, Key: key }),
        { abortSignal: AbortSignal.timeout(300000) },
      );
      if (!stored.Body) throw new Error("Archived backup cannot be read.");
      const digest = createHash("sha256");
      let bytes = 0;
      for await (const chunk of stored.Body as AsyncIterable<Uint8Array>) {
        bytes += chunk.byteLength;
        digest.update(chunk);
        if (bytes > info.size)
          throw new Error("Archived backup size mismatch.");
      }
      if (bytes !== info.size || digest.digest("hex") !== sha256)
        throw new Error("Archived backup checksum mismatch.");
      files.push({ name, bytes, sha256 });
    }
    const completedAt = new Date().toISOString();
    await client.send(
      new PutObjectCommand({
        Bucket: env.BACKUP_S3_BUCKET,
        Key: `backups/${id}/COMPLETE.json`,
        Body: JSON.stringify({ version: 1, id, completedAt, files }),
        ContentType: "application/json",
      }),
      { abortSignal: AbortSignal.timeout(20000) },
    );
    await db.setting.upsert({
      where: { key: "backup.remote" },
      create: {
        key: "backup.remote",
        value: json({ id, completedAt, verified: true }),
      },
      update: { value: json({ id, completedAt, verified: true }) },
    });
    return { id, verified: true, files: files.length };
  } finally {
    client.destroy();
  }
}
