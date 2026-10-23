import { createReadStream } from "node:fs";
import { readdir, lstat } from "node:fs/promises";
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

export async function archiveBackup(directory: string) {
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
  const id = path.basename(directory);
  if (!/^buatin-[0-9TZ-]+-[a-f0-9-]{36}$/.test(id))
    throw new Error("Invalid backup ID.");
  const names = (await readdir(directory)).sort();
  if (
    !names.includes("envelope.json") ||
    !names.includes("manifest.json.enc") ||
    !names.includes("database.dump.enc") ||
    names.some(
      (name) =>
        !/^(?:envelope\.json|(?:manifest\.json|database\.dump|[a-f0-9-]{36}\.blob)\.enc)$/.test(
          name,
        ),
    )
  )
    throw new Error(
      "Only complete encrypted backup directories can be archived.",
    );
  const client = new S3Client({
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
