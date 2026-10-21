import { createHash } from "node:crypto";
import { db } from "./db";
import { getEnv } from "./config";
import { AppError } from "./errors";

export type AiAudit = { userId?: string; resourceId: string };
type Reservation = {
  id: string;
  keys: string[];
  tokens: number;
  cost: bigint;
  inputRate: number;
  outputRate: number;
};
export function estimatedMicros(
  input: number,
  output: number,
  inputRate: number,
  outputRate: number,
) {
  return BigInt(Math.ceil(input * inputRate + output * outputRate));
}
export async function reserveAiUsage(
  audit: AiAudit,
  task: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  now = new Date(),
): Promise<Reservation> {
  const env = getEnv();
  const day = now.toISOString().slice(0, 10);
  const keys = [`real:${day}:global`];
  if (audit.userId)
    keys.push(
      `real:${day}:user:${createHash("sha256").update(audit.userId).digest("hex")}`,
    );
  const tokens = inputTokens + outputTokens;
  const cost = estimatedMicros(
    inputTokens,
    outputTokens,
    env.LLM_INPUT_USD_PER_MILLION,
    env.LLM_OUTPUT_USD_PER_MILLION,
  );
  if (
    env.LLM_DAILY_BUDGET_USD > 0 &&
    (!env.LLM_INPUT_USD_PER_MILLION || !env.LLM_OUTPUT_USD_PER_MILLION)
  )
    throw new AppError(
      "LLM_PRICING_REQUIRED",
      503,
      "Tarif AI belum dikonfigurasi operator.",
    );
  return db.$transaction(async (tx) => {
    // One transaction covers web, worker, retries and concurrent reservations.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70421021)`;
    for (const [index, id] of keys.entries()) {
      const period = await tx.aiBudgetPeriod.upsert({
        where: { id },
        create: { id, day },
        update: {},
      });
      if (
        period.requests + 1 >
          (index
            ? env.LLM_USER_DAILY_REQUEST_LIMIT
            : env.LLM_DAILY_REQUEST_LIMIT) ||
        period.tokens + tokens >
          (index
            ? env.LLM_USER_DAILY_TOKEN_LIMIT
            : env.LLM_DAILY_TOKEN_LIMIT) ||
        (!index &&
          env.LLM_DAILY_BUDGET_USD > 0 &&
          period.costMicros + cost >
            BigInt(Math.floor(env.LLM_DAILY_BUDGET_USD * 1000000)))
      )
        throw new AppError(
          "LLM_DAILY_LIMIT",
          429,
          "Batas penggunaan AI harian tercapai. Coba kembali besok atau hubungi dukungan.",
        );
      await tx.aiBudgetPeriod.update({
        where: { id },
        data: {
          requests: { increment: 1 },
          tokens: { increment: tokens },
          costMicros: { increment: cost },
        },
      });
    }
    const usage = await tx.aiUsage.create({
      data: {
        ...audit,
        task,
        model,
        mock: false,
        reservedTokens: tokens,
        estimatedCostMicros: cost,
      },
    });
    return {
      id: usage.id,
      keys,
      tokens,
      cost,
      inputRate: env.LLM_INPUT_USD_PER_MILLION,
      outputRate: env.LLM_OUTPUT_USD_PER_MILLION,
    };
  });
}
export async function settleAiUsage(
  reservation: Reservation,
  result: {
    tokens_in: number | null;
    tokens_out: number | null;
    model_used: string | null;
  },
) {
  // Missing usage and failed/ambiguous requests retain the full reservation.
  const known = result.tokens_in !== null && result.tokens_out !== null;
  const tokens = known
    ? result.tokens_in! + result.tokens_out!
    : reservation.tokens;
  const cost = known
    ? estimatedMicros(
        result.tokens_in!,
        result.tokens_out!,
        reservation.inputRate,
        reservation.outputRate,
      )
    : reservation.cost;
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70421021)`;
    const changed = await tx.aiUsage.updateMany({
      where: { id: reservation.id, status: "started" },
      data: {
        status: "succeeded",
        modelUsed: result.model_used,
        tokensIn: result.tokens_in,
        tokensOut: result.tokens_out,
        estimatedCostMicros: cost,
      },
    });
    if (!changed.count) return;
    for (const id of reservation.keys)
      await tx.aiBudgetPeriod.update({
        where: { id },
        data: {
          tokens: { increment: tokens - reservation.tokens },
          costMicros: { increment: cost - reservation.cost },
        },
      });
  });
}
