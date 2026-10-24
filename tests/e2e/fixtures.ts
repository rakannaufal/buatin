import "dotenv/config";
import { randomBytes } from "node:crypto";
import {
  test as base,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { createAuth } from "../../src/server/auth";
import { getEnv } from "../../src/server/config";
import { db } from "../../src/server/db";
import { ACTIVE_STATUSES } from "../../src/domain/types";
import { clearTestBilling } from "../helpers/saas";
import { removeReference } from "../../src/server/reference-storage";

type TestAccount = { id: string; email: string; password: string };
const isLoopback = (hostname: string) =>
  ["localhost", "127.0.0.1", "[::1]"].includes(hostname);

export async function removeAccount(
  account: TestAccount,
  request: APIRequestContext,
  origin: string,
) {
  const fixture = await db.user.findUnique({ where: { id: account.id } });
  if (fixture?.email !== account.email || !fixture.email.startsWith("e2e-"))
    throw new Error("Refusing to clean up an account outside this test");

  const jobs = await db.job.findMany({
    where: { userId: account.id },
    select: { id: true },
  });
  for (const job of jobs) {
    const cancelled = await request.post(`/api/jobs/${job.id}/cancel`, {
      headers: { Origin: origin },
    });
    expect(cancelled.status()).toBe(202);
  }
  await expect
    .poll(
      async () => {
        const [activeJobs, activePlans] = await Promise.all([
          db.job.count({
            where: { userId: account.id, status: { in: ACTIVE_STATUSES } },
          }),
          db.planningTask.count({
            where: {
              project: { userId: account.id },
              status: { in: ["queued", "running"] },
            },
          }),
        ]);
        return activeJobs + activePlans;
      },
      { timeout: 45000, message: "Wait for fixture workers before cleanup" },
    )
    .toBe(0);

  const references = await db.projectAttachment.findMany({
    where: { project: { userId: account.id } },
    select: { id: true, storageKey: true },
  });
  await clearTestBilling(account.id);
  await db.$transaction(async (tx) => {
    const tasks = await tx.planningTask.findMany({
      where: { project: { userId: account.id } },
      select: { id: true },
    });
    await tx.outboxEvent.deleteMany({
      where: {
        resourceId: {
          in: [...jobs, ...tasks, ...references].map((item) => item.id),
        },
      },
    });
    await tx.idempotencyKey.deleteMany({ where: { userId: account.id } });
    await tx.dataRequest.deleteMany({ where: { userId: account.id } });
    await tx.job.deleteMany({ where: { userId: account.id } });
    await tx.plan.deleteMany({ where: { project: { userId: account.id } } });
    await tx.user.delete({ where: { id: account.id } });
    await tx.usageDaily.deleteMany({ where: { userId: account.id } });
    await tx.auditEvent.deleteMany({ where: { userId: account.id } });
  });
  for (const reference of references)
    await removeReference(reference.storageKey);
}

export const test = base.extend<{ testAccount: TestAccount }>({
  testAccount: async ({ baseURL, page }, provideAccount) => {
    const env = getEnv();
    if (
      env.MOCK_LLM !== "true" ||
      !baseURL ||
      !isLoopback(new URL(baseURL).hostname) ||
      [env.DATABASE_URL, env.DATABASE_DIRECT_URL, env.DATABASE_WORKER_URL]
        .filter(Boolean)
        .some((value) => !isLoopback(new URL(value).hostname))
    )
      throw new Error("E2E requires a loopback app/database and MOCK_LLM=true");
    const configuration = await page.request.get("/api/public-config");
    if (!(await configuration.json()).mock)
      throw new Error("E2E refuses to use a web server connected to real AI.");

    const email = `e2e-${crypto.randomUUID()}@localhost.test`;
    const password = randomBytes(24).toString("base64url");
    const result = await createAuth(true).api.signUpEmail({
      body: { name: "E2E fixture", email, password },
    });
    const account = { id: result.user.id, email, password };
    try {
      await db.user.update({
        where: { id: account.id },
        data: { role: "user", emailVerified: true },
      });
      await provideAccount(account);
    } finally {
      await removeAccount(account, page.request, baseURL);
    }
  },
});

export async function login(page: Page, account: TestAccount) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  const submit = page.getByRole("button", {
    name: "Masuk",
    exact: true,
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const [response] = await Promise.all([
      page.waitForResponse(
        (result) =>
          new URL(result.url()).pathname === "/api/auth/sign-in/email" &&
          result.request().method() === "POST",
      ),
      submit.click(),
    ]);
    if (response.status() !== 429) {
      expect(response.ok(), "Fixture login must succeed").toBe(true);
      break;
    }
    const seconds = Number(
      response.headers()["retry-after"] ??
        response.headers()["x-retry-after"] ??
        "10",
    );
    expect(Number.isFinite(seconds) && seconds >= 0 && seconds <= 60).toBe(
      true,
    );
    // Shared loopback IP uses the real auth limiter; honor its backoff.
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000 + 100));
  }
  await expect(page).toHaveURL(/dashboard/);
  const session = await page.request.get("/api/session");
  expect(session.status()).toBe(200);
  const state = await session.json();
  expect(state.user.id).toBe(account.id);
  expect(state.mock).toBe(true);
}

test.afterAll(async () => {
  await db.$disconnect();
});

export { expect };
