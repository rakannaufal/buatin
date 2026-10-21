import "dotenv/config";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { getEnv } from "../src/server/config";
import { postgresCommand } from "../src/server/backup";

const env = getEnv();
if (
  env.MOCK_LLM !== "true" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(env.DATABASE_URL).hostname,
  )
)
  throw new Error(
    "Migration regression requires a loopback database and MOCK_LLM=true.",
  );

const database = `buatin_admin_upgrade_${crypto.randomUUID().replaceAll("-", "")}`;
const url = new URL(env.DATABASE_URL);
url.pathname = `/${database}`;
let stage = "create isolated database";
const client = new Client({ connectionString: url.toString() });
try {
  await postgresCommand("createdb", [database]);
  await client.connect();
  const directories = (await readdir("prisma/migrations"))
    .filter((name) => /^\d+_/.test(name))
    .sort();
  const adminMigration = "20261021050000_admin_management";
  for (const name of directories.filter((name) => name < adminMigration)) {
    stage = name;
    await client.query(
      await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"),
    );
  }
  stage = "seed historical invoices and entitlements";
  await client.query(
    `INSERT INTO "User" ("id","name","email","emailVerified","createdAt","updatedAt") VALUES ('upgrade-user','Migration fixture','upgrade-fixture@localhost.test',true,now(),now())`,
  );
  await client.query(`INSERT INTO "Payment" ("id","userId","planId","planName","amount","weeklyQuota","retentionDays","priority","method","status","expiresAt","paidAt","updatedAt") VALUES
    ('upgrade-paid','upgrade-user','plus','Legacy Plus',123450,7,45,7,'NQ','paid','2026-10-01','2026-10-01',now()),
    ('upgrade-pending','upgrade-user','starter','Legacy Starter',90000,4,20,2,'NQ','pending','2026-11-01',null,now())`);
  await client.query(
    `INSERT INTO "Subscription" ("id","userId","planId","paymentId","startsAt","endsAt","weeklyQuota","retentionDays","priority") VALUES ('upgrade-subscription','upgrade-user','plus','upgrade-paid','2026-10-01','2026-11-01',7,45,7)`,
  );
  await client.query(
    `INSERT INTO "UsagePeriod" ("userId","key","startsAt","jobsCount","plansCount") VALUES ('upgrade-user','fixture-week','2026-10-19',2,3)`,
  );
  await client.query(
    `INSERT INTO "QuotaLedger" ("id","userId","periodKey","jobId","action","delta") VALUES ('upgrade-ledger','upgrade-user','fixture-week','upgrade-job','reserve',1)`,
  );
  const queries = [
    'SELECT id, "amount", "status", "planName", "weeklyQuota", "retentionDays", "priority" FROM "Payment" ORDER BY id',
    'SELECT id, "paymentId", "startsAt", "endsAt", "weeklyQuota", "retentionDays", "priority" FROM "Subscription" ORDER BY id',
    'SELECT * FROM "QuotaLedger" ORDER BY id',
    'SELECT * FROM "UsagePeriod" ORDER BY "userId", "key"',
  ];
  const baseline = [];
  for (const query of queries) baseline.push((await client.query(query)).rows);
  for (const name of directories.filter((name) => name >= adminMigration)) {
    stage = name;
    await client.query(
      await readFile(`prisma/migrations/${name}/migration.sql`, "utf8"),
    );
  }
  stage = "compare historical financial data";
  for (const [index, query] of queries.entries())
    assert.deepEqual((await client.query(query)).rows, baseline[index]);
  const payments = (
    await client.query(
      'SELECT amount, subtotal, discount, features FROM "Payment"',
    )
  ).rows;
  for (const payment of payments) {
    assert.equal(payment.subtotal, payment.amount);
    assert.equal(payment.discount, 0);
    assert.equal(typeof payment.features.batch, "boolean");
  }
  const subscription = (
    await client.query(
      'SELECT "planName", "plannerLimit", features FROM "Subscription"',
    )
  ).rows[0];
  assert.equal(subscription.planName, "Legacy Plus");
  assert.equal(subscription.plannerLimit, 28);
  assert.equal(subscription.features.regeneration, true);
  assert.equal(subscription.features.batch, false);
  assert.equal(
    (
      await client.query(
        `SELECT column_default FROM information_schema.columns WHERE table_name='Payment' AND column_name='subtotal'`,
      )
    ).rows[0].column_default,
    null,
  );
  console.log(
    JSON.stringify({
      ok: true,
      database,
      historicalPayments: payments.length,
      originalBenefitsPreserved: true,
    }),
  );
} catch (error) {
  const code =
    error instanceof Error && "code" in error
      ? String(error.code)
      : "ASSERTION_FAILED";
  console.error(JSON.stringify({ ok: false, database, stage, code }));
  process.exitCode = 1;
} finally {
  await client.end();
}
