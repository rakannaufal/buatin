import "dotenv/config";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const file = path.resolve(process.env.BACKUP_KEY_FILE || ".local/backup-key");
await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
await writeFile(file, randomBytes(32).toString("base64") + "\n", {
  flag: "wx",
  mode: 0o600,
});
console.log(
  `Backup key created privately at ${file}. Keep a separate secure copy; existing keys are never overwritten.`,
);
