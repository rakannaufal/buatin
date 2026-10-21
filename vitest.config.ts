import { defineConfig } from "vitest/config";
import "dotenv/config";
export default defineConfig({
  test: {
    testTimeout: 90000,
    hookTimeout: 30000,
    fileParallelism: false,
    env: { MOCK_LLM: "true", NINEROUTER_API_KEY: "" },
    setupFiles: ["./tests/setup.ts"],
  },
});
