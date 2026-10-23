import { catalog } from "../src/domain/catalog";
import "dotenv/config";
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import { db } from "../src/server/db";
import { createAuth } from "../src/server/auth";
import {
  queuePlan,
  startJob,
  resumeJob,
  changePlan,
} from "../src/server/projects";

if (
  process.env.MOCK_LLM !== "true" ||
  !["127.0.0.1", "localhost"].includes(
    new URL(process.env.DATABASE_URL!).hostname,
  )
)
  throw new Error(
    "Recovery check requires a local mock database. Stop the normal worker first.",
  );
const mock = (
  process.env.MOCK_LLM_BASE_URL || "http://127.0.0.1:4010/v1"
).replace(/\/v1\/?$/, "");
async function control(data: unknown) {
  await fetch(mock + "/__control", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
async function until<T>(
  read: () => Promise<T>,
  ready: (value: T) => boolean,
  timeout = 90000,
) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await read();
    if (ready(value)) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Recovery check timed out.");
}
let child: ChildProcess | undefined;
async function worker() {
  const processHandle = spawn(
    process.execPath,
    ["--import", "tsx", "src/worker/index.ts"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        JOB_STALE_AFTER_SEC: "30",
        JOB_HEARTBEAT_SEC: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child = processHandle;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            "Worker did not become ready. Ensure no other worker is running.",
          ),
        ),
      20000,
    );
    processHandle.stdout?.on("data", (data) => {
      if (String(data).includes("worker ready")) {
        clearTimeout(timer);
        resolve();
      }
    });
    processHandle.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("Worker exited before startup."));
    });
  });
  return processHandle;
}
async function stop(signal: NodeJS.Signals) {
  if (child && child.exitCode === null && child.signalCode === null) {
    const ended = once(child, "exit");
    child.kill(signal);
    await ended;
  }
  child = undefined;
}
let userId = "",
  projectId = "";
try {
  await worker();
  const user = await createAuth(true).api.signUpEmail({
    body: {
      name: "Worker restart fixture",
      email: `recovery-${crypto.randomUUID()}@localhost.test`,
      password: randomBytes(24).toString("hex"),
    },
  });
  userId = user.user.id;
  const project = await db.project.create({
    data: {
      userId,
      name: "Worker restart fixture",
      webType: "landing",
      brief:
        "Landing page publik untuk studio desain UMKM, halaman layanan, portofolio, proses kerja dan kontak WhatsApp. Tanpa login atau pembayaran. Tampilan mobile yang mudah digunakan.",
      expiresAt: new Date(Date.now() + 3600000),
    },
  });
  projectId = project.id;
  await control({});
  await queuePlan(userId, project.id, 1);
  await until(
    () => db.project.findUniqueOrThrow({ where: { id: project.id } }),
    (value) => value.status === "plan_ready",
  );
  let version = 1;
  for (const file of catalog)
    version = (await changePlan(userId, project.id, version, file.id, true))
      .version;
  const { id } = await startJob(
    userId,
    project.id,
    version,
    "actual-process-restart",
  );
  await until(
    () => db.job.findUniqueOrThrow({ where: { id } }),
    (value) =>
      value.status === "running" && value.done >= 2 && value.done < value.total,
  );
  await stop("SIGKILL");
  const checkpoint = await db.jobFile.findUniqueOrThrow({
    where: { jobId_fileId: { jobId: id, fileId: "brief" } },
  });
  console.log(
    "Worker killed after persisted checkpoints. Waiting 31 seconds for its test lease to expire.",
  );
  await new Promise((resolve) => setTimeout(resolve, 31000));
  await control({});
  await worker();
  const interrupted = await db.job.findUniqueOrThrow({ where: { id } });
  if (
    interrupted.status !== "failed" ||
    interrupted.errorCode !== "WORKER_INTERRUPTED"
  )
    throw new Error("Expired worker lease was not recovered.");
  await resumeJob(userId, id, "actual-process-resume");
  const done = await until(
    () => db.job.findUniqueOrThrow({ where: { id } }),
    (value) => ["succeeded", "partial", "failed"].includes(value.status),
  );
  const resumed = await db.jobFile.findUniqueOrThrow({
    where: { jobId_fileId: { jobId: id, fileId: "brief" } },
  });
  if (
    done.status !== "succeeded" ||
    resumed.checksum !== checkpoint.checksum ||
    resumed.attempts !== checkpoint.attempts
  )
    throw new Error("Restart did not preserve successful checkpoints.");
  console.log(
    `Recovery verified: SIGKILL, expired lease, new worker, resume, ${done.done}/${done.total} documents, successful checkpoint unchanged.`,
  );
} finally {
  await stop("SIGTERM");
  await control({});
  if (userId) {
    const ids = [
      ...(await db.job.findMany({ where: { userId }, select: { id: true } })),
      ...(await db.planningTask.findMany({
        where: { projectId },
        select: { id: true },
      })),
    ].map((item) => item.id);
    await db.outboxEvent.deleteMany({ where: { resourceId: { in: ids } } });
    await db.idempotencyKey.deleteMany({ where: { userId } });
    await db.job.deleteMany({ where: { userId } });
    await db.plan.deleteMany({ where: { projectId } });
    await db.aiUsage.deleteMany({ where: { userId } });
    await db.quotaLedger.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
    await db.usageDaily.deleteMany({ where: { userId } });
    await db.auditEvent.deleteMany({ where: { userId } });
  }
  await db.$disconnect();
}
