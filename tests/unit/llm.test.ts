import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { callLlm, checkModels } from "../../src/server/llm";
import { AppError } from "../../src/server/errors";
import type { LlmConfig } from "../../src/domain/types";
const config: LlmConfig = {
  baseUrl: "http://fixture.invalid/v1",
  authMode: "header",
  planner: "mock-planner",
  writer: "mock-writer",
  mock: true,
  timeout: 1000,
  interval: 0,
  maxTokens: 100,
  maxResponseBytes: 2048,
  systemAsUser: false,
  temperaturePlanner: 0.1,
  temperatureWriter: 0.4,
};
const success = () =>
  Response.json({
    choices: [{ message: { content: "# Output" }, finish_reason: "stop" }],
    model: "reported-model",
  });
let testDay = 0;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2100, 0, ++testDay)));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});
it("isolates mock credentials and preserves unknown usage", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(success());
  const output = await callLlm(config, "write", "system", {});
  expect(output).toMatchObject({
    tokens_in: null,
    tokens_out: null,
    model_used: "reported-model",
  });
  const init = fetcher.mock.calls[0][1]!;
  expect(init.headers).toMatchObject({
    Authorization: `Bearer ${process.env.MOCK_LLM_API_KEY || "mock-fixture-not-a-real-key"}`,
  });
  expect(init.redirect).toBe("error");
});
it.each([401, 403, 404])(
  "fails HTTP %i without retry or authentication downgrade",
  async (status) => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("", { status }));
    await expect(callLlm(config, "write", "system", {})).rejects.toMatchObject({
      code: status === 404 ? "LLM_MODEL_MISSING" : "LLM_AUTH",
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);
it("retries transient responses within the request budget and honors Retry-After", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response("", { status: 429, headers: { "Retry-After": "2" } }),
    )
    .mockResolvedValueOnce(success());
  const budget = vi.fn(async () => {});
  const result = callLlm(config, "write", "system", {}, budget);
  await vi.runAllTimersAsync();
  expect((await result).content).toBe("# Output");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(budget).toHaveBeenCalledTimes(2);
});
it("rejects oversized responses and invalid model lists", async () => {
  vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(Response.json({ content: "x".repeat(3000) }))
    .mockResolvedValueOnce(Response.json({ data: [] }));
  await expect(callLlm(config, "write", "system", {})).rejects.toMatchObject({
    code: "LLM_RESPONSE_TOO_LARGE",
  });
  await expect(checkModels(config)).rejects.toMatchObject({
    code: "LLM_MODEL_MISSING",
  });
});
it("supports explicit unauthenticated internal mode", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(success());
  await callLlm(
    { ...config, authMode: "none", systemAsUser: true },
    "plan",
    "system",
    {},
  );
  expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty("Authorization");
  const body = JSON.parse(String(fetcher.mock.calls[0][1]?.body));
  expect(body.messages).toHaveLength(1);
  expect(body.messages[0].role).toBe("user");
});
it("interrupts retry backoff when cancellation arrives", async () => {
  const fetcher = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response("", { status: 429, headers: { "Retry-After": "60" } }),
    );
  const abort = new AbortController();
  const result = callLlm(
    config,
    "write",
    "system",
    {},
    async () => {},
    abort.signal,
  );
  const assertion = expect(result).rejects.toMatchObject({ code: "CANCELLED" });
  await vi.advanceTimersByTimeAsync(1);
  abort.abort(new AppError("CANCELLED", 409));
  await assertion;
  expect(fetcher).toHaveBeenCalledTimes(1);
});
