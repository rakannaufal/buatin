import "dotenv/config";
import { llmConfig, checkModels, callLlm } from "../src/server/llm";
import { db } from "../src/server/db";
import { AppError } from "../src/server/errors";

try {
  process.env.MOCK_LLM = "false";
  const current = await llmConfig();
  const config = current;
  const models = await checkModels(config, false);
  console.log(JSON.stringify({ provider: "9router", models }));
  if (process.argv.includes("--smoke")) {
    if (
      ![config.planner, config.writer].every((model) => models.includes(model))
    )
      throw new AppError("LLM_MODEL_MISSING", 503);
    const unique = [...new Set([config.planner, config.writer])];
    for (const model of unique) {
      const result = await callLlm(
        {
          ...config,
          planner: model,
          writer: model,
          maxTokens: 128,
          timeout: 60000,
        },
        "write",
        'Return only the JSON object {"ok":true}.',
        { check: "connection" },
        async () => {},
        undefined,
        { resourceId: `operator-smoke:${crypto.randomUUID()}` },
      );
      if (!/"ok"\s*:\s*true/.test(result.content))
        throw new AppError("LLM_SMOKE_INVALID", 503);
      console.log(
        JSON.stringify({
          model,
          modelUsed: result.model_used,
          ok: true,
          tokensIn: result.tokens_in,
          tokensOut: result.tokens_out,
        }),
      );
    }
  }
} catch (error) {
  console.error(
    JSON.stringify({
      ok: false,
      code: error instanceof AppError ? error.code : "PROVIDER_CHECK_FAILED",
    }),
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
