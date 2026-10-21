import { spawnSync } from "node:child_process";

// No database migration or bootstrap account creation during image builds.
for (const script of ["db:generate", "build:worker", "build"]) {
  const result = spawnSync("npm", ["run", script], { stdio: "inherit" });
  if (result.error || result.status !== 0) process.exit(result.status ?? 1);
}
