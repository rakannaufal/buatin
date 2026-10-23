import { z } from "zod";
const schema = z.object({
  APP_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  DATABASE_DIRECT_URL: z.string().default(""),
  DATABASE_WORKER_URL: z.string().default(""),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(30).default(10),
  DATABASE_WORKER_POOL_MAX: z.coerce.number().int().min(1).max(20).default(5),
  BETTER_AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().trim().default(""),
  GOOGLE_CLIENT_SECRET: z.string().trim().default(""),
  OWNER_EMAIL: z.email().default("owner@localhost.test"),
  SUPPORT_EMAIL: z.union([z.email(), z.literal("")]).default(""),
  EMAIL_PROVIDER: z.enum(["local", "resend"]).default("local"),
  EMAIL_FROM: z.string().default("Buatin <noreply@example.com>"),
  RESEND_API_KEY: z.string().optional(),
  TURNSTILE_SITE_KEY: z.string().default(""),
  TURNSTILE_SECRET_KEY: z.string().default(""),
  DUITKU_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  DUITKU_MERCHANT_CODE: z.string().default(""),
  DUITKU_API_KEY: z.string().default(""),
  DUITKU_QRIS_METHOD: z.enum(["NQ", "SQ"]).default("NQ"),
  DUITKU_EXPIRY_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
  LLM_BASE_URL: z.url().default("http://127.0.0.1:20128/v1"),
  LLM_AUTH_MODE: z.enum(["header", "none"]).default("header"),
  NINEROUTER_API_KEY: z.string().optional(),
  LLM_MODEL_PLANNER: z.string().default(""),
  LLM_MODEL_WRITER: z.string().default(""),
  MOCK_LLM: z.string().default("true"),
  MOCK_LLM_BASE_URL: z.url().default("http://127.0.0.1:4010/v1"),
  MOCK_LLM_API_KEY: z.string().default("mock-fixture-not-a-real-key"),
  LLM_REQUEST_TIMEOUT_SEC: z.coerce.number().int().positive().default(300),
  LLM_HEALTHCHECK_TIMEOUT_SEC: z.coerce.number().int().positive().default(10),
  LLM_MIN_INTERVAL_MS: z.coerce.number().int().min(0).default(500),
  LLM_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(6000),
  LLM_TEMPERATURE_PLANNER: z.coerce.number().min(0).max(2).default(0.1),
  LLM_TEMPERATURE_WRITER: z.coerce.number().min(0).max(2).default(0.4),
  LLM_SYSTEM_AS_USER: z.string().default("false"),
  MAX_LLM_RESPONSE_BYTES: z.coerce.number().int().positive().default(1048576),
  MAX_LLM_INPUT_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(1048576)
    .default(262144),
  LLM_INPUT_TOKEN_OVERHEAD: z.coerce
    .number()
    .int()
    .min(512)
    .max(100000)
    .default(8192),
  LLM_DAILY_REQUEST_LIMIT: z.coerce
    .number()
    .int()
    .positive()
    .max(1000000)
    .default(2000),
  LLM_USER_DAILY_REQUEST_LIMIT: z.coerce
    .number()
    .int()
    .positive()
    .max(1000000)
    .default(500),
  LLM_DAILY_TOKEN_LIMIT: z.coerce
    .number()
    .int()
    .positive()
    .max(1000000000)
    .default(20000000),
  LLM_USER_DAILY_TOKEN_LIMIT: z.coerce
    .number()
    .int()
    .positive()
    .max(1000000000)
    .default(4000000),
  LLM_DAILY_BUDGET_USD: z.coerce.number().min(0).max(100000).default(0),
  LLM_INPUT_USD_PER_MILLION: z.coerce.number().min(0).max(10000).default(0),
  LLM_OUTPUT_USD_PER_MILLION: z.coerce.number().min(0).max(10000).default(0),
  MAX_LLM_CALLS_PER_JOB: z.coerce.number().int().positive().default(400),
  MAX_FILE_TOTAL_REQUESTS: z.coerce.number().int().positive().default(8),
  CLARIFY_MODE: z.enum(["auto", "off"]).default("auto"),
  MAX_BRIEF_CHARS: z.coerce.number().int().positive().default(8000),
  MAX_BRIEF_UPLOAD_BYTES: z.coerce.number().int().positive().default(131072),
  MAX_REFERENCE_FILES: z.coerce.number().int().min(1).max(20).default(10),
  MAX_REFERENCE_IMAGE_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(10485760)
    .default(5242880),
  MAX_REFERENCE_DOCUMENT_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(20971520)
    .default(10485760),
  MAX_REFERENCE_TOTAL_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(104857600)
    .default(26214400),
  REFERENCE_STORAGE: z.enum(["local", "s3"]).default("local"),
  REFERENCE_STORAGE_DIR: z.string().default(".local/references"),
  REFERENCE_SCANNER_PATH: z.string().default(""),
  REFERENCE_PARSE_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .max(60000)
    .default(20000),
  REFERENCE_S3_ENDPOINT: z.union([z.url(), z.literal("")]).default(""),
  REFERENCE_S3_REGION: z.string().default("auto"),
  REFERENCE_S3_BUCKET: z.string().default(""),
  REFERENCE_S3_ACCESS_KEY: z.string().default(""),
  REFERENCE_S3_SECRET_KEY: z.string().default(""),
  LLM_VISION_MODEL: z.string().default(""),
  MAX_DOC_FILES: z.coerce.number().int().min(11).max(42).default(42),
  MAX_PLANS_PER_HOUR: z.coerce.number().int().positive().default(10),
  DRAFT_TTL_HOURS: z.coerce.number().int().positive().default(24),
  JOB_HEARTBEAT_SEC: z.coerce.number().int().min(1).default(30),
  JOB_STALE_AFTER_SEC: z.coerce.number().int().min(30).default(900),
  MAX_ARCHIVE_BYTES: z.coerce.number().int().positive().default(20971520),
  TEMPLATES_DIR: z.string().default("./templates"),
  TEMPLATE_SOURCE: z
    .enum(["fallback", "builtin", "original"])
    .default("builtin"),
  ADMIN_REQUIRE_2FA: z.enum(["true", "false"]).default("true"),
  BACKUP_S3_ENDPOINT: z.union([z.url(), z.literal("")]).default(""),
  BACKUP_S3_REGION: z.string().default("auto"),
  BACKUP_S3_BUCKET: z.string().default(""),
  BACKUP_S3_ACCESS_KEY: z.string().default(""),
  BACKUP_S3_SECRET_KEY: z.string().default(""),
  BACKUP_DIRECTORY: z.string().default(".local/backups"),
  BACKUP_KEY_FILE: z.string().default(".local/backup-key"),
  BACKUP_MAX_AGE_HOURS: z.coerce.number().int().min(1).max(168).default(36),
  TZ: z.string().default("Asia/Jakarta"),
});
export function getEnv() {
  const env = schema.parse(process.env);
  if (process.env.VERCEL !== "1") return env;
  // Buffered Vercel Function payloads are limited to 4.5 MB; leave headroom.
  const payloadBytes = 3 * 1048576;
  return {
    ...env,
    DATABASE_POOL_MAX: Math.min(env.DATABASE_POOL_MAX, 3),
    MAX_REFERENCE_IMAGE_BYTES: Math.min(
      env.MAX_REFERENCE_IMAGE_BYTES,
      payloadBytes,
    ),
    MAX_REFERENCE_DOCUMENT_BYTES: Math.min(
      env.MAX_REFERENCE_DOCUMENT_BYTES,
      payloadBytes,
    ),
    MAX_ARCHIVE_BYTES: Math.min(env.MAX_ARCHIVE_BYTES, payloadBytes),
  };
}
export function dayKey(date = new Date(), zone = getEnv().TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
