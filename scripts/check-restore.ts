import "dotenv/config";
import { spawnSync } from "node:child_process";
import path from "node:path";
const file = process.argv[2];
if (!file)
  throw new Error("Usage: npm run db:check-restore -- path/to/backup.dump");
const url = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
  throw new Error(
    "Legacy plaintext restore is restricted to an isolated loopback PostgreSQL target. Use the encrypted backup runbook for production recovery.",
  );
const name = `speckit_restore_${Date.now()}`;
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || "5432",
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
};
function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { env, encoding: "utf8" });
  if (result.status !== 0)
    throw new Error(
      `${command} failed; check permissions and backup compatibility.`,
    );
  return result.stdout;
}
run("createdb", [name]);
run("pg_restore", [
  "--no-owner",
  "--exit-on-error",
  "--dbname",
  name,
  path.resolve(file),
]);
const count = run("psql", [
  "-d",
  name,
  "-tAc",
  'SELECT count(*) FROM "Project"',
]);
console.log(
  `Restore verified in separate database ${name}; projects: ${count.trim()}. Original database unchanged. Retained for inspection; delete manually when no longer needed.`,
);
