import { beforeAll, expect } from "vitest";

beforeAll(async () => {
  if (!expect.getState().testPath?.includes("/integration/")) return;
  const local = (host: string) =>
    ["localhost", "127.0.0.1", "[::1]"].includes(host);
  const app = new URL(process.env.APP_URL || "http://localhost:3000");
  const database = new URL(process.env.DATABASE_URL || "");
  if (!local(app.hostname) || !local(database.hostname))
    throw new Error(
      "Integration fixtures require a loopback application and database.",
    );
  const response = await fetch(new URL("/api/public-config", app), {
    signal: AbortSignal.timeout(5000),
  });
  const state = await response.json();
  if (!response.ok || state.mock !== true)
    throw new Error(
      "Integration fixtures require a web server running MOCK_LLM=true.",
    );
});
