import { Client } from "pg";
import { spawn } from "node:child_process";
import {
  mkdir,
  writeFile,
  unlink,
  rename,
  readFile,
  stat,
  readdir,
  lstat,
} from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { getEnv } from "./config";
import { directDatabaseUrl } from "./database-config";
import { db } from "./db";
import { readReference } from "./reference-storage";
import {
  backupKey,
  encryptBackup,
  decryptBackup,
  fileHash,
} from "./backup-crypto";

const entrySchema = z.object({
  file: z.string().regex(/^(database\.dump|[a-f0-9-]{36}\.blob)$/),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
const manifestSchema = z.object({
  version: z.literal(1),
  id: z.string().regex(/^buatin-[0-9TZ-]+-[a-f0-9-]{36}$/),
  createdAt: z.iso.datetime(),
  projects: z.number().int().nonnegative(),
  files: z.array(entrySchema).min(1),
});
export function postgresEnvironment(database?: string) {
  const url = new URL(directDatabaseUrl());
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: database || decodeURIComponent(url.pathname.slice(1)),
    ...(url.searchParams.get("sslmode")
      ? { PGSSLMODE: url.searchParams.get("sslmode")! }
      : {}),
  };
}
export async function postgresCommand(
  command: string,
  args: string[],
  database?: string,
) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      env: postgresEnvironment(database),
      stdio: "ignore",
      timeout: 600000,
    });
    child.once("error", () => reject(new Error(`${command} unavailable.`)));
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(
              `${command} failed. Check PostgreSQL connectivity, permissions and version.`,
            ),
          ),
    );
  });
}
export async function createBackup() {
  const env = getEnv(),
    key = await backupKey(env.BACKUP_KEY_FILE);
  const root = path.resolve(env.BACKUP_DIRECTORY);
  const id = `buatin-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID()}`;
  const directory = path.join(root, `${id}.partial`);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const connection = new Client({
    connectionString: directDatabaseUrl(),
    connectionTimeoutMillis: 5000,
  });
  await connection.connect();
  try {
    await connection.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const snapshot = (
      await connection.query<{ id: string }>(
        "SELECT pg_export_snapshot() AS id",
      )
    ).rows[0].id;
    const references = (
      await connection.query<{
        storageKey: string;
        checksum: string;
        bytes: number;
      }>('SELECT "storageKey", checksum, bytes FROM "ProjectAttachment"')
    ).rows;
    const projects = Number(
      (
        await connection.query<{ count: string }>(
          'SELECT count(*) FROM "Project"',
        )
      ).rows[0].count,
    );
    const dump = path.join(directory, "database.dump");
    await postgresCommand("pg_dump", [
      "--format=custom",
      "--no-owner",
      "--no-acl",
      "--snapshot",
      snapshot,
      "--file",
      dump,
    ]);
    const files = [
      {
        file: "database.dump",
        bytes: (await stat(dump)).size,
        sha256: await fileHash(dump),
      },
    ];
    await encryptBackup(dump, `${dump}.enc`, key, `${id}/database.dump`);
    await unlink(dump);
    for (const reference of references) {
      if (
        !/^[a-f0-9-]{36}\.blob$/.test(reference.storageKey) ||
        !/^[a-f0-9]{64}$/.test(reference.checksum)
      )
        throw new Error(
          "Attachment metadata cannot be verified; backup incomplete.",
        );
      const data = await readReference(reference.storageKey);
      const sha256 = createHash("sha256").update(data).digest("hex");
      if (sha256 !== reference.checksum || data.length !== reference.bytes)
        throw new Error(
          "Attachment changed during backup; retry after processing completes.",
        );
      const file = path.join(directory, reference.storageKey);
      await writeFile(file, data, { flag: "wx", mode: 0o600 });
      await encryptBackup(
        file,
        `${file}.enc`,
        key,
        `${id}/${reference.storageKey}`,
      );
      await unlink(file);
      files.push({ file: reference.storageKey, bytes: data.length, sha256 });
    }
    await connection.query("COMMIT");
    const manifest = path.join(directory, "manifest.json");
    await writeFile(
      manifest,
      JSON.stringify({
        version: 1,
        id,
        createdAt: new Date().toISOString(),
        projects,
        files,
      }),
      { flag: "wx", mode: 0o600 },
    );
    await encryptBackup(
      manifest,
      `${manifest}.enc`,
      key,
      `${id}/manifest.json`,
    );
    await unlink(manifest);
    await writeFile(
      path.join(directory, "envelope.json"),
      JSON.stringify({ version: 1, id, cipher: "aes-256-gcm" }),
      { flag: "wx", mode: 0o600 },
    );
    const complete = path.join(root, id);
    await rename(directory, complete);
    // The web host has a different filesystem from the backup job.
    await connection.query(
      `INSERT INTO "Setting" (key, value, "updatedAt") VALUES ('backup.completed', $1::jsonb, now() AT TIME ZONE 'UTC')
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = EXCLUDED."updatedAt"`,
      [JSON.stringify({ id, completedAt: new Date().toISOString() })],
    );
    return { directory: complete, files: files.length, projects };
  } finally {
    await connection.end();
  }
}
export async function checkBackup(directory: string, restoreDatabase = false) {
  const env = getEnv(),
    key = await backupKey(env.BACKUP_KEY_FILE);
  const root = path.resolve(directory);
  const envelope = z
    .object({
      version: z.literal(1),
      id: manifestSchema.shape.id,
      cipher: z.literal("aes-256-gcm"),
    })
    .parse(
      JSON.parse(await readFile(path.join(root, "envelope.json"), "utf8")),
    );
  const inspection = path.resolve(
    ".local",
    `restore-check-${crypto.randomUUID()}`,
  );
  await mkdir(inspection, { recursive: true, mode: 0o700 });
  await decryptBackup(
    path.join(root, "manifest.json.enc"),
    path.join(inspection, "manifest.json"),
    key,
    `${envelope.id}/manifest.json`,
  );
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(path.join(inspection, "manifest.json"), "utf8")),
  );
  if (
    manifest.id !== envelope.id ||
    new Set(manifest.files.map((file) => file.file)).size !==
      manifest.files.length ||
    manifest.files.filter((file) => file.file === "database.dump").length !== 1
  )
    throw new Error("Invalid backup manifest.");
  for (const entry of manifest.files) {
    const file = path.join(inspection, entry.file);
    const source = path.join(root, `${entry.file}.enc`);
    if (!(await lstat(source)).isFile())
      throw new Error("Backup entries must be regular files.");
    await decryptBackup(source, file, key, `${envelope.id}/${entry.file}`);
    if (
      (await stat(file)).size !== entry.bytes ||
      (await fileHash(file)) !== entry.sha256
    )
      throw new Error("Backup checksum mismatch.");
  }
  let database: string | null = null;
  if (restoreDatabase) {
    database = `buatin_restore_${crypto.randomUUID().replaceAll("-", "")}`;
    await postgresCommand("createdb", [database]);
    await postgresCommand("pg_restore", [
      "--no-owner",
      "--no-acl",
      "--exit-on-error",
      "--dbname",
      database,
      path.join(inspection, "database.dump"),
    ]);
    const url = new URL(directDatabaseUrl());
    url.pathname = `/${database}`;
    const connection = new Client({
      connectionString: url.href,
      connectionTimeoutMillis: 5000,
    });
    await connection.connect();
    try {
      const projects = Number(
        (
          await connection.query<{ count: string }>(
            'SELECT count(*) FROM "Project"',
          )
        ).rows[0].count,
      );
      const references = (
        await connection.query<{
          storageKey: string;
          checksum: string;
          bytes: number;
        }>('SELECT "storageKey", checksum, bytes FROM "ProjectAttachment"')
      ).rows;
      if (
        projects !== manifest.projects ||
        references.length !== manifest.files.length - 1 ||
        references.some(
          (reference) =>
            !manifest.files.some(
              (file) =>
                file.file === reference.storageKey &&
                file.sha256 === reference.checksum &&
                file.bytes === reference.bytes,
            ),
        )
      )
        throw new Error("Restored database and attachments do not match.");
    } finally {
      await connection.end();
    }
  }
  return { inspection, database, files: manifest.files.length };
}
export async function latestBackup() {
  const receipt = await db.setting.findUnique({
    where: { key: "backup.completed" },
  });
  const recorded = z
    .object({
      id: manifestSchema.shape.id,
      completedAt: z.iso.datetime(),
    })
    .safeParse(receipt?.value);
  if (recorded.success) {
    const ageHours =
      (Date.now() - Date.parse(recorded.data.completedAt)) / 3600000;
    if (ageHours >= 0)
      return { ageHours, source: "shared" as const, id: recorded.data.id };
  }
  const root = path.resolve(getEnv().BACKUP_DIRECTORY);
  const names = await readdir(root).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const complete = names
    .filter((name) => /^buatin-[0-9TZ-]+-[a-f0-9-]{36}$/.test(name))
    .sort()
    .reverse();
  if (!complete[0]) return null;
  const file = await stat(path.join(root, complete[0], "envelope.json"));
  return {
    ageHours: (Date.now() - file.mtimeMs) / 3600000,
    source: "filesystem" as const,
    directory: path.join(root, complete[0]),
  };
}
