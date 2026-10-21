import {
  controlsSchema,
  defaultSite,
  siteSchema,
  type planEditSchema,
} from "../../domain/admin";
import type { z } from "zod";
import { db, type Transaction } from "../db";
import { getEnv } from "../config";
import { AppError } from "../errors";

export type PlanValue = z.infer<typeof planEditSchema>;
export async function controls(tx: Transaction = db) {
  const env = getEnv();
  const record = await tx.setting.findUnique({
    where: { key: "admin.controls" },
  });
  const fallback = {
    pauseSignup: false,
    pauseCheckout: false,
    pauseGeneration: false,
    maintenanceMessage: "",
    dailyRequests: env.LLM_DAILY_REQUEST_LIMIT,
    userDailyRequests: env.LLM_USER_DAILY_REQUEST_LIMIT,
    dailyTokens: env.LLM_DAILY_TOKEN_LIMIT,
    userDailyTokens: env.LLM_USER_DAILY_TOKEN_LIMIT,
    dailyBudgetUsd: env.LLM_DAILY_BUDGET_USD,
    inputRate: env.LLM_INPUT_USD_PER_MILLION,
    outputRate: env.LLM_OUTPUT_USD_PER_MILLION,
    adminCreditLimit: 0,
    adminGrantDays: 0,
  };
  const parsed = controlsSchema.safeParse(record?.value ?? fallback);
  if (!parsed.success) throw new AppError("SETTINGS_INVALID", 503);
  const value = parsed.data;
  return {
    ...value,
    pricingVersion: record?.version ?? 0,
    dailyRequests: Math.min(value.dailyRequests, env.LLM_DAILY_REQUEST_LIMIT),
    userDailyRequests: Math.min(
      value.userDailyRequests,
      env.LLM_USER_DAILY_REQUEST_LIMIT,
    ),
    dailyTokens: Math.min(value.dailyTokens, env.LLM_DAILY_TOKEN_LIMIT),
    userDailyTokens: Math.min(
      value.userDailyTokens,
      env.LLM_USER_DAILY_TOKEN_LIMIT,
    ),
    dailyBudgetUsd:
      env.LLM_DAILY_BUDGET_USD > 0
        ? Math.min(
            value.dailyBudgetUsd || env.LLM_DAILY_BUDGET_USD,
            env.LLM_DAILY_BUDGET_USD,
          )
        : value.dailyBudgetUsd,
  };
}
export async function siteSettings(tx: Transaction = db) {
  const record = await tx.setting.findUnique({ where: { key: "admin.site" } });
  return {
    version: record?.version ?? 0,
    value: siteSchema.parse(record?.value ?? defaultSite),
  };
}
export async function assertServiceOpen(
  kind: "Signup" | "Checkout" | "Generation",
  tx: Transaction = db,
) {
  const policy = await controls(tx);
  if (policy[`pause${kind}`])
    throw new AppError(
      "SERVICE_PAUSED",
      503,
      policy.maintenanceMessage ||
        "Layanan sementara dijeda pengelola. Coba lagi nanti.",
    );
}
