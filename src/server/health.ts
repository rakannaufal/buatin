import { Pool } from "pg";
import { getEnv } from "./config";

const pool = new Pool({
  connectionString: getEnv().DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 1500,
  query_timeout: 1500,
  idleTimeoutMillis: 5000,
  allowExitOnIdle: true,
});
pool.on("error", () =>
  console.error(JSON.stringify({ event: "health.database.connection.failed" })),
);
export type Readiness = { ok: boolean; database: boolean; worker: boolean };
let pending: Promise<Readiness> | undefined;
let expires = 0;
export function readiness(): Promise<Readiness> {
  if (pending && Date.now() < expires) return pending;
  expires = Date.now() + 1000;
  pending = (async () => {
    try {
      // Prisma stores UTC timestamps without a zone; pg otherwise assumes local time.
      const result = await pool.query<{
        worker_at: Date | null;
        unfinished: string;
        migrated: boolean;
      }>(`
        SELECT (SELECT "updatedAt" AT TIME ZONE 'UTC' FROM "Setting" WHERE key = 'worker') AS worker_at,
          (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL) AS unfinished,
          EXISTS(SELECT 1 FROM "_prisma_migrations" WHERE migration_name = '20261021040000_data_requests' AND finished_at IS NOT NULL AND rolled_back_at IS NULL) AS migrated
      `);
      const row = result.rows[0];
      const database = Boolean(row && row.unfinished === "0" && row.migrated);
      const worker = Boolean(
        row?.worker_at && Date.now() - row.worker_at.getTime() < 30000,
      );
      return { ok: database && worker, database, worker };
    } catch {
      return { ok: false, database: false, worker: false };
    }
  })();
  return pending;
}
