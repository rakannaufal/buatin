import {
  mkdir,
  writeFile,
  readFile,
  readdir,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getEnv } from "./config";
import { AppError } from "./errors";
import { db } from "./db";
import { userLock } from "./limits";
import {
  supabaseStorageConfigured,
  putSupabaseReference,
  getSupabaseReference,
  deleteSupabaseReference,
  listSupabaseReferences,
} from "./supabase-storage";

export function referenceStorageConfigured() {
  const env = getEnv();
  if (env.REFERENCE_STORAGE === "supabase") return supabaseStorageConfigured();
  if (env.REFERENCE_STORAGE === "s3")
    return Boolean(
      env.REFERENCE_S3_BUCKET &&
      env.REFERENCE_S3_ACCESS_KEY &&
      env.REFERENCE_S3_SECRET_KEY &&
      (!env.REFERENCE_S3_ENDPOINT ||
        env.REFERENCE_S3_ENDPOINT.startsWith("https:")),
    );
  return (
    process.env.VERCEL !== "1" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(env.APP_URL).hostname)
  );
}
const validKey = (key: string) => /^[a-f0-9-]{36}\.blob$/.test(key);
function localDirectory() {
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(
      new URL(getEnv().APP_URL).hostname,
    ) ||
    process.env.VERCEL === "1"
  )
    throw new AppError(
      "STORAGE_UNCONFIGURED",
      503,
      "Hosting memerlukan storage privat persisten yang dikonfigurasi bersama worker.",
    );
  const directory = path.resolve(getEnv().REFERENCE_STORAGE_DIR);
  if (
    directory === path.resolve("public") ||
    directory.startsWith(path.resolve("public") + path.sep)
  )
    throw new AppError(
      "UNSAFE_STORAGE",
      503,
      "Storage referensi harus privat.",
    );
  return directory;
}
function s3() {
  const env = getEnv();
  if (env.REFERENCE_S3_ENDPOINT) {
    const endpoint = new URL(env.REFERENCE_S3_ENDPOINT);
    if (
      endpoint.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)
    )
      throw new AppError(
        "UNSAFE_STORAGE",
        503,
        "Endpoint storage publik memerlukan HTTPS.",
      );
  }
  if (
    !env.REFERENCE_S3_BUCKET ||
    !env.REFERENCE_S3_ACCESS_KEY ||
    !env.REFERENCE_S3_SECRET_KEY
  )
    throw new AppError(
      "STORAGE_UNCONFIGURED",
      503,
      "Storage privat belum dikonfigurasi.",
    );
  return new S3Client({
    region: env.REFERENCE_S3_REGION,
    ...(env.REFERENCE_S3_ENDPOINT
      ? { endpoint: env.REFERENCE_S3_ENDPOINT, forcePathStyle: true }
      : {}),
    credentials: {
      accessKeyId: env.REFERENCE_S3_ACCESS_KEY,
      secretAccessKey: env.REFERENCE_S3_SECRET_KEY,
    },
    maxAttempts: 2,
  });
}
export async function writeReference(key: string, data: Buffer) {
  if (!validKey(key)) throw new AppError("INVALID_STORAGE_KEY", 400);
  if (getEnv().REFERENCE_STORAGE === "supabase")
    return putSupabaseReference(key, data);
  if (getEnv().REFERENCE_STORAGE === "s3") {
    const client = s3();
    try {
      await client.send(
        new PutObjectCommand({
          Bucket: getEnv().REFERENCE_S3_BUCKET,
          Key: `references/${key}`,
          Body: data,
          ContentType: "application/octet-stream",
        }),
        { abortSignal: AbortSignal.timeout(20000) },
      );
    } finally {
      client.destroy();
    }
  } else {
    const directory = localDirectory();
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(path.join(directory, key), data, { mode: 0o600 });
  }
}
export async function readReference(key: string) {
  if (!validKey(key)) throw new AppError("INVALID_STORAGE_KEY", 400);
  if (getEnv().REFERENCE_STORAGE === "supabase")
    return getSupabaseReference(key);
  if (getEnv().REFERENCE_STORAGE !== "s3") {
    const file = path.join(localDirectory(), key);
    if (
      (await stat(file)).size >
      Math.max(
        getEnv().MAX_REFERENCE_DOCUMENT_BYTES,
        getEnv().MAX_REFERENCE_IMAGE_BYTES,
      )
    )
      throw new AppError("REFERENCE_TOO_LARGE", 413);
    return readFile(file);
  }
  const client = s3();
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: getEnv().REFERENCE_S3_BUCKET,
        Key: `references/${key}`,
      }),
      { abortSignal: AbortSignal.timeout(20000) },
    );
    if (!response.Body) throw new AppError("REFERENCE_MISSING", 404);
    const chunks: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      total += chunk.byteLength;
      if (
        total >
        Math.max(
          getEnv().MAX_REFERENCE_DOCUMENT_BYTES,
          getEnv().MAX_REFERENCE_IMAGE_BYTES,
        )
      )
        throw new AppError("REFERENCE_TOO_LARGE", 413);
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } finally {
    client.destroy();
  }
}
export async function removeReference(key: string) {
  if (!validKey(key)) return;
  if (getEnv().REFERENCE_STORAGE === "supabase")
    return deleteSupabaseReference(key);
  if (getEnv().REFERENCE_STORAGE === "s3") {
    const client = s3();
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: getEnv().REFERENCE_S3_BUCKET,
          Key: `references/${key}`,
        }),
        { abortSignal: AbortSignal.timeout(20000) },
      );
    } finally {
      client.destroy();
    }
  } else
    await unlink(path.join(localDirectory(), key)).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      },
    );
}
export async function cleanupReferenceStorage(deadline = Infinity) {
  const known = new Set(
    (await db.projectAttachment.findMany({ select: { storageKey: true } })).map(
      (item) => item.storageKey,
    ),
  );
  const cutoff = Date.now() - 3600000;
  if (getEnv().REFERENCE_STORAGE === "supabase") {
    if (Number.isFinite(deadline)) {
      const state = await db.setting.findUnique({
        where: { key: "storage.sweep" },
      });
      const offsetValue = (state?.value as { offset?: number } | undefined)
        ?.offset;
      const offset =
        typeof offsetValue === "number" &&
        Number.isSafeInteger(offsetValue) &&
        offsetValue >= 0
          ? offsetValue
          : 0;
      const objects = await listSupabaseReferences(offset);
      for (const item of objects) {
        if (Date.now() >= deadline) break;
        if (
          validKey(item.key) &&
          !known.has(item.key) &&
          item.modified < cutoff
        )
          await removeReference(item.key);
      }
      await db.setting.upsert({
        where: { key: "storage.sweep" },
        create: {
          key: "storage.sweep",
          value: { offset: objects.length === 100 ? offset + 100 : 0 },
        },
        update: {
          value: { offset: objects.length === 100 ? offset + 100 : 0 },
        },
      });
      return;
    }
    // Delete after listing so offset pagination cannot skip objects after removals.
    const orphaned: string[] = [];
    for (let offset = 0; offset < 10000; offset += 100) {
      const objects = await listSupabaseReferences(offset);
      for (const item of objects)
        if (
          validKey(item.key) &&
          !known.has(item.key) &&
          item.modified < cutoff
        )
          orphaned.push(item.key);
      if (objects.length < 100) break;
    }
    for (const key of orphaned) await removeReference(key);
    return;
  }
  if (getEnv().REFERENCE_STORAGE === "s3") {
    const client = s3();
    try {
      let continuation: string | undefined;
      do {
        const objects = await client.send(
          new ListObjectsV2Command({
            Bucket: getEnv().REFERENCE_S3_BUCKET,
            Prefix: "references/",
            MaxKeys: 1000,
            ContinuationToken: continuation,
          }),
          { abortSignal: AbortSignal.timeout(20000) },
        );
        for (const object of objects.Contents ?? []) {
          const key = object.Key?.replace(/^references\//, "") ?? "";
          if (
            validKey(key) &&
            !known.has(key) &&
            (object.LastModified?.getTime() ?? Infinity) < cutoff
          )
            await removeReference(key);
        }
        continuation = objects.IsTruncated
          ? objects.NextContinuationToken
          : undefined;
      } while (continuation);
    } finally {
      client.destroy();
    }
  } else {
    const directory = localDirectory();
    const names = await readdir(directory).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return [];
        throw error;
      },
    );
    for (const key of names)
      if (
        validKey(key) &&
        !known.has(key) &&
        (await stat(path.join(directory, key))).mtimeMs < cutoff
      )
        await removeReference(key);
  }
}

function snapshotReferenceIds(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object") return [];
  const context = (snapshot as Record<string, unknown>).projectContext;
  if (!context || typeof context !== "object") return [];
  const references = (context as Record<string, unknown>).references;
  return Array.isArray(references)
    ? references.flatMap((reference: unknown) =>
        reference &&
        typeof reference === "object" &&
        "id" in reference &&
        typeof reference.id === "string"
          ? [reference.id]
          : [],
      )
    : [];
}

export async function cleanupDetachedReferences(deadline = Infinity) {
  const cutoff = new Date(Date.now() - 3600000);
  const candidates = await db.projectAttachment.findMany({
    where: {
      included: false,
      updatedAt: { lt: cutoff },
      status: { not: "processing" },
    },
    select: { projectId: true, project: { select: { userId: true } } },
    take: 100,
  });
  const projects = new Map(
    candidates.map((attachment) => [
      attachment.projectId,
      attachment.project.userId,
    ]),
  );
  for (const [projectId, userId] of projects) {
    if (Date.now() >= deadline) break;
    await db.$transaction(async (tx) => {
      await userLock(tx, userId);
      const [revisions, jobs, tasks] = await Promise.all([
        tx.projectRevision.findMany({
          where: { projectId },
          select: { attachmentIds: true },
        }),
        tx.job.findMany({ where: { projectId }, select: { snapshot: true } }),
        tx.planningTask.findMany({
          where: { projectId, status: { in: ["queued", "running"] } },
          select: { snapshot: true },
        }),
      ]);
      const retained = new Set([
        ...revisions.flatMap(({ attachmentIds }) =>
          Array.isArray(attachmentIds)
            ? attachmentIds.filter((id): id is string => typeof id === "string")
            : [],
        ),
        ...[...jobs, ...tasks].flatMap(({ snapshot }) =>
          snapshotReferenceIds(snapshot),
        ),
      ]);
      const detached = await tx.projectAttachment.findMany({
        where: {
          projectId,
          included: false,
          updatedAt: { lt: cutoff },
          status: { not: "processing" },
          id: { notIn: [...retained] },
        },
        select: { id: true },
      });
      const ids = detached.map((attachment) => attachment.id);
      await tx.outboxEvent.deleteMany({
        where: { eventType: "reference", resourceId: { in: ids } },
      });
      await tx.projectAttachment.deleteMany({
        where: { id: { in: ids }, included: false },
      });
    });
  }
}
