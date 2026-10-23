import { getEnv } from "./config";
import { hostedConfigurationIssues } from "./hosted";
import { AppError } from "./errors";

export function assertRuntimeConfiguration() {
  const env = getEnv();
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(env.APP_URL).hostname,
  );
  if (process.env.VERCEL !== "1" && local) return;
  const issues = hostedConfigurationIssues("web");
  if (issues.length) {
    console.error(
      JSON.stringify({
        event: "runtime.configuration.invalid",
        fields: issues.map((issue) => issue.split(":")[0]),
      }),
    );
    throw new AppError(
      "SERVICE_UNCONFIGURED",
      503,
      "Layanan belum siap. Pengelola perlu melengkapi konfigurasi produksi.",
    );
  }
}
