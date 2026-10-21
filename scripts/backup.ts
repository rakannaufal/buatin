import "dotenv/config";
import { createBackup, checkBackup } from "../src/server/backup";
import { db } from "../src/server/db";
try {
  const input = process.argv[2];
  const result = input
    ? await checkBackup(input, process.argv.includes("--restore"))
    : await createBackup();
  console.log(JSON.stringify({ ok: true, ...result }));
} catch {
  console.error(
    "Backup operation failed. Check key permissions, PostgreSQL tools, disk space and attachment integrity. Incomplete .partial folders are not valid backups.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
