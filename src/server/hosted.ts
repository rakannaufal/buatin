import { getEnv } from "./config";
import { publicAuthReady } from "./challenge";
import { googleAuthReady } from "./google-auth";
import { directDatabaseUrl, workerDatabaseUrl } from "./database-config";

const loopback = (host: string) =>
  ["localhost", "127.0.0.1", "[::1]", "0.0.0.0", "[::]"].includes(host);

export function hostedConfigurationIssues() {
  const env = getEnv();
  const issues: string[] = [];
  const app = new URL(env.APP_URL);
  if (
    app.protocol !== "https:" ||
    loopback(app.hostname) ||
    env.APP_URL !== app.origin
  )
    issues.push(
      "APP_URL: gunakan origin HTTPS publik tanpa path atau kredensial.",
    );
  for (const [name, value] of [
    ["DATABASE_URL", env.DATABASE_URL],
    ["DATABASE_DIRECT_URL", directDatabaseUrl()],
    ["DATABASE_WORKER_URL", workerDatabaseUrl()],
  ]) {
    try {
      const url = new URL(value);
      if (
        !["postgresql:", "postgres:"].includes(url.protocol) ||
        loopback(url.hostname) ||
        !url.hostname ||
        !url.username ||
        url.pathname.length < 2
      )
        issues.push(`${name}: gunakan PostgreSQL produksi, bukan loopback.`);
      if (
        name !== "DATABASE_URL" &&
        (url.port === "6543" || url.searchParams.get("pgbouncer") === "true")
      )
        issues.push(
          `${name}: migration/lock memerlukan koneksi direct/session, bukan transaction pooler.`,
        );
    } catch {
      issues.push(`${name}: URL PostgreSQL tidak valid.`);
    }
  }
  if (!publicAuthReady())
    issues.push("AUTH: lengkapi Resend, pengirim terverifikasi dan Turnstile.");
  if (!googleAuthReady())
    issues.push(
      "GOOGLE: isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET; aktifkan Turnstile.",
    );
  if (env.ADMIN_REQUIRE_2FA !== "true")
    issues.push("ADMIN_REQUIRE_2FA: wajib true.");
  if (env.MOCK_LLM !== "false")
    issues.push("MOCK_LLM: wajib false pada layanan pengguna.");
  const llm = new URL(env.LLM_BASE_URL);
  if (loopback(llm.hostname) || llm.protocol !== "https:")
    issues.push(
      "LLM_BASE_URL: gunakan endpoint HTTPS yang terjangkau Vercel dan worker.",
    );
  if (env.LLM_AUTH_MODE !== "header" || !env.NINEROUTER_API_KEY)
    issues.push("AI: konfigurasi autentikasi 9router belum lengkap.");
  if (!env.LLM_MODEL_PLANNER || !env.LLM_MODEL_WRITER)
    issues.push("AI: tentukan model planner dan writer yang tersedia.");
  if (
    env.LLM_DAILY_BUDGET_USD <= 0 ||
    env.LLM_INPUT_USD_PER_MILLION <= 0 ||
    env.LLM_OUTPUT_USD_PER_MILLION <= 0
  )
    issues.push("AI: isi tarif konservatif dan batas estimasi USD harian.");
  if (
    env.REFERENCE_STORAGE !== "s3" ||
    !env.REFERENCE_S3_BUCKET ||
    !env.REFERENCE_S3_ACCESS_KEY ||
    !env.REFERENCE_S3_SECRET_KEY ||
    (env.REFERENCE_S3_ENDPOINT &&
      !env.REFERENCE_S3_ENDPOINT.startsWith("https:"))
  )
    issues.push(
      "STORAGE: web dan worker memerlukan bucket S3-compatible privat yang sama.",
    );
  if (
    !env.SUPPORT_EMAIL ||
    /@(?:localhost\.test|example\.com)$/.test(env.SUPPORT_EMAIL)
  )
    issues.push("SUPPORT_EMAIL: isi alamat bantuan operasional.");
  return issues;
}
