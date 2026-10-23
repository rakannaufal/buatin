import "dotenv/config";
import { createBackup, checkBackup } from "../src/server/backup";
import { archiveBackup } from "../src/server/backup-remote";
import { getEnv } from "../src/server/config";
import { db } from "../src/server/db";
try {
  const input = process.argv[2];
  const hosted = !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(getEnv().APP_URL).hostname,
  );
  if (!input && hosted && !getEnv().BACKUP_S3_BUCKET)
    throw new Error("Hosted backups require off-host storage.");
  const result = input
    ? await checkBackup(input, process.argv.includes("--restore"))
    : await createBackup();
  const remote =
    !input && "directory" in result && getEnv().BACKUP_S3_BUCKET
      ? await archiveBackup(result.directory)
      : undefined;
  console.log(JSON.stringify({ ok: true, ...result, remote }));
} catch {
  console.error(
    "Backup operation failed. Check key permissions, PostgreSQL tools, disk space and attachment integrity. Incomplete .partial folders are not valid backups.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
