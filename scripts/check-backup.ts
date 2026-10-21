import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/server/db";
import { getEnv } from "../src/server/config";
import { createBackup, checkBackup } from "../src/server/backup";
import {
  writeReference,
  removeReference,
} from "../src/server/reference-storage";
const env = getEnv();
if (
  env.MOCK_LLM !== "true" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(env.DATABASE_URL).hostname,
  ) ||
  env.REFERENCE_STORAGE !== "local"
)
  throw new Error(
    "Backup fixture requires a loopback database, local storage and MOCK_LLM=true.",
  );
const id = crypto.randomUUID(),
  key = `${crypto.randomUUID()}.blob`;
const data = Buffer.from(`Private backup fixture ${crypto.randomUUID()}`);
let created = false;
try {
  await db.user.create({
    data: {
      id,
      name: "Backup fixture",
      email: `backup-${id}@localhost.test`,
      emailVerified: true,
    },
  });
  created = true;
  await writeReference(key, data);
  const project = await db.project.create({
    data: {
      userId: id,
      name: "Backup integrity fixture",
      webType: "landing",
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  await db.projectAttachment.create({
    data: {
      projectId: project.id,
      storageKey: key,
      name: "fixture.txt",
      mime: "text/plain",
      status: "ready",
      bytes: data.length,
      checksum: createHash("sha256").update(data).digest("hex"),
    },
  });
  const backup = await createBackup();
  const restored = await checkBackup(backup.directory, true);
  if (!(await readFile(path.join(restored.inspection, key))).equals(data))
    throw new Error("Restored attachment differs from source.");
  console.log(
    JSON.stringify({
      ok: true,
      backup: backup.directory,
      restoredDatabase: restored.database,
      inspection: restored.inspection,
      files: restored.files,
      attachmentVerified: true,
    }),
  );
} catch {
  console.error(
    "Backup fixture failed; inspect private partial/restore folders and PostgreSQL tools.",
  );
  process.exitCode = 1;
} finally {
  if (created) await db.user.delete({ where: { id } });
  await removeReference(key);
  await db.$disconnect();
}
