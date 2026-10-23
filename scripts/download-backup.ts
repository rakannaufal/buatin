import "dotenv/config";
import { downloadBackup } from "../src/server/backup-remote";
import { getEnv } from "../src/server/config";
import { db } from "../src/server/db";

try {
  const id = process.argv[2];
  if (!id) throw new Error("Backup ID is required.");
  const result = await downloadBackup(
    id,
    process.argv[3] || getEnv().BACKUP_DIRECTORY,
  );
  console.log(
    JSON.stringify({ ok: true, ...result, decrypted: false, restored: false }),
  );
} catch {
  console.error(
    "Backup download failed. Check ID, private S3 access, receipt/checksums, disk space and the 10 GiB limit. Failed downloads remain private .partial directories.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
