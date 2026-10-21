import "dotenv/config";
import { PgBoss } from "pg-boss";
import { Client } from "pg";
import { db, json } from "../server/db";
import { getEnv } from "../server/config";
import { processPlan } from "./planner";
import { generateJob } from "./generator";
import { maintenance } from "./maintenance";
import { processReference } from "./references";
import { deliverEmails } from "../server/email";
import { maintainBilling } from "../server/billing";
const lock = new Client({ connectionString: getEnv().DATABASE_URL });
await lock.connect();
const result = await lock.query<{ locked: boolean }>(
  "SELECT pg_try_advisory_lock(70421020) AS locked",
);
if (!result.rows[0].locked) {
  await lock.end();
  throw new Error(
    "A Buatin worker is already running. Use WORKER_CONCURRENCY in this process.",
  );
}
lock.on("error", () => {
  console.error(JSON.stringify({ event: "worker.lock.lost" }));
  process.exit(1);
});
const boss = new PgBoss({
  connectionString: getEnv().DATABASE_URL,
  schema: "pgboss",
  max: 5,
});
boss.on("error", () => console.error(JSON.stringify({ event: "queue.error" })));
await boss.start();
for (const name of ["plan", "generate", "reference", "maintenance"])
  await boss.createQueue(name, {
    policy: "short",
    retryLimit: 0,
    expireInSeconds: 28800,
    retentionSeconds: 86400,
  });
await boss.work<{ id: string }>(
  "plan",
  { batchSize: 1, pollingIntervalSeconds: 1 },
  async (jobs) => {
    for (const job of jobs) await processPlan(job.data.id);
  },
);
await boss.work<{ id: string }>(
  "generate",
  {
    batchSize: 1,
    pollingIntervalSeconds: 1,
    localConcurrency: getEnv().WORKER_CONCURRENCY,
    localGroupConcurrency: 1,
  },
  async (jobs) => {
    for (const job of jobs) await generateJob(job.data.id);
  },
);
await boss.work("maintenance", async () => {
  await maintenance();
});
await boss.work<{ id: string }>(
  "reference",
  { batchSize: 1, pollingIntervalSeconds: 1, localConcurrency: 2 },
  async (jobs) => {
    for (const job of jobs) await processReference(job.data.id);
  },
);
await boss.schedule("maintenance", "*/10 * * * *");
await maintenance();
let dispatching = false;
async function dispatch() {
  if (dispatching) return;
  dispatching = true;
  try {
    const events = await db.outboxEvent.findMany({
      where: { dispatchedAt: null },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    for (const event of events) {
      const job =
        event.eventType === "generate"
          ? await db.job.findUnique({ where: { id: event.resourceId } })
          : null;
      await boss.send(
        event.eventType,
        { id: event.resourceId },
        {
          singletonKey: event.id,
          retryLimit: 0,
          expireInSeconds: 28800,
          ...(job
            ? {
                group: { id: job.userId },
                priority:
                  job.priority - Math.floor(job.createdAt.getTime() / 60000),
              }
            : {}),
        },
      );
      await db.outboxEvent.update({
        where: { id: event.id },
        data: { dispatchedAt: new Date(), attempts: { increment: 1 } },
      });
    }
    await db.setting.upsert({
      where: { key: "worker" },
      create: { key: "worker", value: json({ at: new Date().toISOString() }) },
      update: { value: json({ at: new Date().toISOString() }) },
    });
  } catch {
    console.error(JSON.stringify({ event: "outbox.dispatch.failed" }));
  } finally {
    dispatching = false;
  }
}
const timer = setInterval(() => {
  void dispatch();
}, 1000);
let auxiliaryRunning = false;
async function auxiliary() {
  if (auxiliaryRunning) return;
  auxiliaryRunning = true;
  try {
    await maintainBilling();
    await deliverEmails();
  } catch {
    console.error(JSON.stringify({ event: "worker.billing_mail.failed" }));
  } finally {
    auxiliaryRunning = false;
  }
}
const auxiliaryTimer = setInterval(() => {
  void auxiliary();
}, 15000);
void auxiliary();
await dispatch();
console.log(
  `Buatin worker ready (native Node.js + PostgreSQL, concurrency ${getEnv().WORKER_CONCURRENCY}).`,
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  clearInterval(auxiliaryTimer);
  await boss.stop({ graceful: true, timeout: 10000 });
  await db.$disconnect();
  await lock.end();
  process.exit(0);
}
process.once("SIGTERM", () => {
  void stop();
});
process.once("SIGINT", () => {
  void stop();
});
