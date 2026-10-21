import { getEnv } from "./config";

export function directDatabaseUrl() {
  const env = getEnv();
  return env.DATABASE_DIRECT_URL || env.DATABASE_URL;
}

export function workerDatabaseUrl() {
  const env = getEnv();
  return env.DATABASE_WORKER_URL || directDatabaseUrl();
}
