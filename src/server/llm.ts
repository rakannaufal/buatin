import { db } from "./db";
import { getEnv } from "./config";
import { AppError } from "./errors";
import type { LlmConfig } from "../domain/types";
import { reserveAiUsage, settleAiUsage, type AiAudit } from "./ai-budget";
export interface LlmResult {
  content: string;
  model_used: string | null;
  finish_reason: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
}
export async function llmConfig(): Promise<LlmConfig> {
  const env = getEnv();
  const settings = await db.setting.findUnique({ where: { key: "models" } });
  const value = (settings?.value ?? {}) as {
    planner?: string;
    writer?: string;
  };
  const mock = env.MOCK_LLM === "true";
  return {
    baseUrl: (mock ? env.MOCK_LLM_BASE_URL : env.LLM_BASE_URL).replace(
      /\/+$/,
      "",
    ),
    authMode: env.LLM_AUTH_MODE,
    planner: mock ? "mock-planner" : value.planner || env.LLM_MODEL_PLANNER,
    writer: mock ? "mock-writer" : value.writer || env.LLM_MODEL_WRITER,
    mock,
    timeout: env.LLM_REQUEST_TIMEOUT_SEC * 1000,
    interval: env.LLM_MIN_INTERVAL_MS,
    maxTokens: env.LLM_MAX_OUTPUT_TOKENS,
    maxResponseBytes: env.MAX_LLM_RESPONSE_BYTES,
    systemAsUser: env.LLM_SYSTEM_AS_USER === "true",
    temperaturePlanner: env.LLM_TEMPERATURE_PLANNER,
    temperatureWriter: env.LLM_TEMPERATURE_WRITER,
  };
}
function headers(config: LlmConfig) {
  const env = getEnv();
  const url = new URL(config.baseUrl);
  if (
    !config.mock &&
    (url.username ||
      url.password ||
      (url.protocol !== "https:" &&
        !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))
  )
    throw new AppError("LLM_UNSAFE_ENDPOINT", 503);
  const result: Record<string, string> = { "Content-Type": "application/json" };
  if (config.authMode === "header") {
    const key = config.mock ? env.MOCK_LLM_API_KEY : env.NINEROUTER_API_KEY;
    if (!key)
      throw new AppError("LLM_AUTH", 503, "Layanan AI belum dikonfigurasi.");
    result.Authorization = `Bearer ${key}`;
  }
  return result;
}
async function boundedJson(response: Response, max: number): Promise<unknown> {
  if (!response.body) throw new AppError("LLM_INVALID_RESPONSE", 503);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel();
        throw new AppError("LLM_RESPONSE_TOO_LARGE", 503);
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("LLM_INVALID_RESPONSE", 503);
  }
}
export async function checkModels(config: LlmConfig, requireSelection = true) {
  try {
    const response = await fetch(`${config.baseUrl}/models`, {
      headers: headers(config),
      redirect: "error",
      signal: AbortSignal.timeout(getEnv().LLM_HEALTHCHECK_TIMEOUT_SEC * 1000),
      cache: "no-store",
    });
    if (!response.ok)
      throw new AppError(
        response.status === 401 || response.status === 403
          ? "LLM_AUTH"
          : "LLM_UNAVAILABLE",
        503,
        "Layanan AI sedang tidak tersedia, coba lagi nanti.",
      );
    const body = (await boundedJson(response, config.maxResponseBytes)) as {
      data?: { id?: unknown }[];
    };
    const models =
      body?.data
        ?.map((item) => item.id)
        .filter((id): id is string => typeof id === "string") ?? [];
    if (
      !models.length ||
      (requireSelection &&
        ![config.planner, config.writer].every(
          (id) => id && models.includes(id),
        ))
    )
      throw new AppError(
        "LLM_MODEL_MISSING",
        503,
        "Model AI belum siap. Periksa pengaturan.",
      );
    return models;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "LLM_UNAVAILABLE",
      503,
      "Layanan AI sedang tidak tersedia, coba lagi nanti.",
    );
  }
}
export function retryAfter(value: string | null, now = Date.now()) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  return Number.isNaN(date) ? 0 : Math.max(0, date - now);
}
let nextRequest = 0;
export async function callLlm(
  config: LlmConfig,
  task: "plan" | "write" | "fix",
  system: string,
  input: unknown,
  beforeRequest: () => Promise<void> = async () => {},
  signal?: AbortSignal,
  audit?: AiAudit,
  image?: { mime: string; data: string },
): Promise<LlmResult> {
  const inputBytes =
    Buffer.byteLength(system) + Buffer.byteLength(JSON.stringify(input));
  if (inputBytes > getEnv().MAX_LLM_INPUT_BYTES)
    throw new AppError(
      "LLM_INPUT_TOO_LARGE",
      413,
      "Konteks AI melewati batas ukuran.",
    );
  if (!config.mock && !audit) throw new AppError("LLM_AUDIT_REQUIRED", 503);
  const pause = (ms: number) =>
    new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(signal.reason);
        return;
      }
      const abort = () => {
        clearTimeout(timer);
        reject(signal?.reason);
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener("abort", abort);
        resolve();
      }, ms);
      signal?.addEventListener("abort", abort, { once: true });
    });
  let last: AppError = new AppError("LLM_UNAVAILABLE", 503);
  let wait = 0;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (wait) await pause(Math.min(wait, 60000));
    const interval = Math.max(0, nextRequest - Date.now());
    if (interval) await pause(interval);
    await beforeRequest();
    const reservation =
      !config.mock && audit
        ? await reserveAiUsage(
            audit,
            task,
            task === "plan" ? config.planner : config.writer,
            inputBytes +
              getEnv().LLM_INPUT_TOKEN_OVERHEAD +
              (image ? 32768 : 0),
            config.maxTokens,
          )
        : null;
    const usage =
      reservation ??
      (audit
        ? await db.aiUsage.create({
            data: {
              ...audit,
              task,
              model: task === "plan" ? config.planner : config.writer,
              mock: config.mock,
            },
          })
        : null);
    nextRequest = Date.now() + config.interval;
    try {
      const user = JSON.stringify(input);
      const userContent = image
        ? [
            {
              type: "text",
              text: config.systemAsUser ? `${system}\n\nDATA:\n${user}` : user,
            },
            {
              type: "image_url",
              image_url: { url: `data:${image.mime};base64,${image.data}` },
            },
          ]
        : config.systemAsUser
          ? `${system}\n\nDATA:\n${user}`
          : user;
      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: headers(config),
        redirect: "error",
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(config.timeout)])
          : AbortSignal.timeout(config.timeout),
        body: JSON.stringify({
          model: task === "plan" ? config.planner : config.writer,
          messages: config.systemAsUser
            ? [{ role: "user", content: userContent }]
            : [
                { role: "system", content: system },
                { role: "user", content: userContent },
              ],
          temperature:
            task === "plan"
              ? config.temperaturePlanner
              : config.temperatureWriter,
          max_tokens: config.maxTokens,
          stream: false,
        }),
      });
      if (!response.ok) {
        if ([401, 403].includes(response.status))
          throw new AppError("LLM_AUTH", 503);
        if (response.status === 404)
          throw new AppError("LLM_MODEL_MISSING", 503);
        if (response.status === 429 || response.status >= 500) {
          wait = Math.max(
            retryAfter(response.headers.get("retry-after")),
            Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 250,
          );
          throw new AppError("LLM_TRANSIENT", 503);
        }
        throw new AppError("LLM_REJECTED", 503);
      }
      const body = (await boundedJson(response, config.maxResponseBytes)) as {
        choices?: {
          message?: { content?: unknown };
          finish_reason?: unknown;
        }[];
        model?: unknown;
        usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
      };
      const choice = body?.choices?.[0];
      if (
        typeof choice?.message?.content !== "string" ||
        !choice.message.content.trim()
      )
        throw new AppError("LLM_INVALID_RESPONSE", 503);
      const token = (value: unknown) =>
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= 1000000000
          ? value
          : null;
      const result = {
        content: choice.message.content,
        model_used: typeof body.model === "string" ? body.model : null,
        finish_reason:
          typeof choice.finish_reason === "string"
            ? choice.finish_reason
            : null,
        tokens_in: token(body.usage?.prompt_tokens),
        tokens_out: token(body.usage?.completion_tokens),
      };
      if (reservation)
        await settleAiUsage(reservation, result).catch(() => {
          console.error(
            JSON.stringify({
              event: "ai.usage.update.failed",
              id: reservation.id,
            }),
          );
        });
      else if (usage)
        await db.aiUsage
          .update({
            where: { id: usage.id },
            data: {
              status: "succeeded",
              modelUsed: result.model_used,
              tokensIn: result.tokens_in,
              tokensOut: result.tokens_out,
            },
          })
          .catch(() => {
            console.error(
              JSON.stringify({ event: "ai.usage.update.failed", id: usage.id }),
            );
          });
      return result;
    } catch (error) {
      if (usage)
        await db.aiUsage
          .update({
            where: { id: usage.id },
            data: {
              status: "error",
              errorCode:
                error instanceof AppError ? error.code : "LLM_TRANSIENT",
            },
          })
          .catch(() => {
            console.error(
              JSON.stringify({ event: "ai.usage.update.failed", id: usage.id }),
            );
          });
      if (signal?.aborted) throw signal.reason;
      last =
        error instanceof AppError ? error : new AppError("LLM_TRANSIENT", 503);
      if (!["LLM_TRANSIENT", "LLM_INVALID_RESPONSE"].includes(last.code))
        throw last;
      wait = wait || 1000 * 2 ** attempt;
    }
  }
  throw last;
}
