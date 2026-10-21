import { afterAll, afterEach, expect, it, vi } from "vitest";
import { db } from "../../src/server/db";
import { reserveAiUsage, settleAiUsage } from "../../src/server/ai-budget";
const date = new Date("2097-10-21T12:00:00Z");
const resources: string[] = [];
const keys = new Set<string>();
afterEach(() => vi.unstubAllEnvs());
afterAll(async () => {
  await db.aiUsage.deleteMany({ where: { resourceId: { in: resources } } });
  await db.aiBudgetPeriod.deleteMany({ where: { id: { in: [...keys] } } });
  await db.$disconnect();
});
it("atomically caps concurrent real requests; reconciles known usage once", async () => {
  expect(await db.aiBudgetPeriod.count({ where: { day: "2097-10-21" } })).toBe(
    0,
  );
  vi.stubEnv("LLM_DAILY_REQUEST_LIMIT", "1");
  vi.stubEnv("LLM_DAILY_BUDGET_USD", "1");
  vi.stubEnv("LLM_INPUT_USD_PER_MILLION", "2");
  vi.stubEnv("LLM_OUTPUT_USD_PER_MILLION", "4");
  const audit = { resourceId: `operations-fixture:${crypto.randomUUID()}` };
  resources.push(audit.resourceId);
  const attempts = await Promise.allSettled(
    [1, 2].map(() => reserveAiUsage(audit, "write", "fixture", 100, 100, date)),
  );
  expect(
    attempts.filter((attempt) => attempt.status === "fulfilled"),
  ).toHaveLength(1);
  expect(
    attempts.find((attempt) => attempt.status === "rejected"),
  ).toMatchObject({ reason: { code: "LLM_DAILY_LIMIT" } });
  const reservation = attempts.find(
    (attempt) => attempt.status === "fulfilled",
  )!;
  if (reservation.status !== "fulfilled")
    throw new Error("Missing reservation");
  reservation.value.keys.forEach((key) => keys.add(key));
  await settleAiUsage(reservation.value, {
    tokens_in: 10,
    tokens_out: 20,
    model_used: "fixture",
  });
  await settleAiUsage(reservation.value, {
    tokens_in: 10,
    tokens_out: 20,
    model_used: "fixture",
  });
  expect(
    await db.aiBudgetPeriod.findUniqueOrThrow({
      where: { id: reservation.value.keys[0] },
    }),
  ).toMatchObject({ requests: 1, tokens: 30, costMicros: 100n });
});
it("returns public readiness without connection details", async () => {
  const base = process.env.APP_URL!;
  const response = await fetch(`${base}/api/health/ready`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
  expect((await fetch(`${base}/api/health/live`)).status).toBe(200);
});
