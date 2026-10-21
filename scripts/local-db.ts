import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile, chmod, access } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";
const root = process.cwd();
const dir = path.join(root, ".local/postgres");
await mkdir(path.join(root, ".local/socket"), { recursive: true });
await chmod(path.join(root, ".local"), 0o700);
await chmod(path.join(root, ".local/socket"), 0o700);
let configured = true;
try {
  await access(path.join(root, ".env"));
} catch {
  configured = false;
}
if (!configured) {
  const base = await readFile(path.join(root, ".env.example"), "utf8");
  const password = randomBytes(24).toString("hex");
  await writeFile(
    path.join(root, ".env"),
    base
      .replace(
        "postgresql://speckit:CHANGE_ME@localhost:5432/speckit",
        `postgresql://speckit:${password}@127.0.0.1:55432/speckit`,
      )
      .replace(
        "BETTER_AUTH_SECRET=\n",
        `BETTER_AUTH_SECRET=${randomBytes(48).toString("hex")}\n`,
      )
      .replace("OWNER_EMAIL=\n", "OWNER_EMAIL=owner@localhost.test\n"),
    { mode: 0o600 },
  );
}
const dotenv = await import("dotenv");
dotenv.config({ quiet: true });
const dbUrl = new URL(process.env.DATABASE_URL!);
if (!["127.0.0.1", "localhost"].includes(dbUrl.hostname))
  throw new Error("Local helper only supports loopback PostgreSQL.");
function run(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", env });
  if (result.status !== 0)
    throw new Error(
      `${command} failed: ${result.stderr || result.error?.message || result.stdout}`,
    );
  return result.stdout;
}
try {
  await access(path.join(dir, "PG_VERSION"));
} catch {
  const passFile = path.join(root, ".local/postgres-password");
  await writeFile(passFile, decodeURIComponent(dbUrl.password), {
    mode: 0o600,
  });
  await chmod(passFile, 0o600);
  run("initdb", [
    "-D",
    dir,
    "--username",
    dbUrl.username,
    "--auth-local=trust",
    "--auth-host=scram-sha-256",
    "--pwfile",
    passFile,
    "--encoding=UTF8",
    "--locale=C",
  ]);
}
const status = spawnSync("pg_ctl", ["-D", dir, "status"], { encoding: "utf8" });
if (process.argv.includes("--stop")) {
  if (status.status === 0) run("pg_ctl", ["-D", dir, "stop", "-m", "fast"]);
  console.log("Local PostgreSQL stopped.");
  process.exit(0);
}
if (status.status !== 0)
  run("pg_ctl", [
    "-D",
    dir,
    "-l",
    path.join(root, ".local/postgres.log"),
    "-o",
    `-p ${dbUrl.port || 55432} -h 127.0.0.1 -k ${path.join(root, ".local/socket")}`,
    "-w",
    "start",
  ]);
const name = dbUrl.pathname.slice(1);
if (!/^[a-z_][a-z0-9_]*$/.test(name))
  throw new Error("Invalid local database name.");
const connectionArgs = [
  "-h",
  dbUrl.hostname,
  "-p",
  dbUrl.port,
  "-U",
  dbUrl.username,
];
const pgEnv = {
  ...process.env,
  PGPASSWORD: decodeURIComponent(dbUrl.password),
};
const found = run(
  "psql",
  [
    ...connectionArgs,
    "-d",
    "postgres",
    "-tAc",
    `SELECT 1 FROM pg_database WHERE datname='${name}'`,
  ],
  pgEnv,
);
if (!found.trim()) run("createdb", [...connectionArgs, name], pgEnv);
console.log(
  `PostgreSQL ready on ${dbUrl.hostname}:${dbUrl.port}. Configuration saved in .env (private).`,
);
