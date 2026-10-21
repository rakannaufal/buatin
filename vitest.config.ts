import { defineConfig } from "vitest/config";
import "dotenv/config";
export default defineConfig({
  test: {
    testTimeout: 90000,
    hookTimeout: 30000,
    fileParallelism: false,
    env: {
      MOCK_LLM: "true",
      NINEROUTER_API_KEY: "",
      DATABASE_DIRECT_URL: "",
      DATABASE_WORKER_URL: "",
      GOOGLE_CLIENT_ID: "test-only-google.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "test-only-google-client-secret",
    },
    setupFiles: ["./tests/setup.ts"],
  },
});
