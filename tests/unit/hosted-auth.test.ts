import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { googleLoginError } from "../../src/domain/auth";
import { getEnv } from "../../src/server/config";
import { hostedConfigurationIssues } from "../../src/server/hosted";
import {
  directDatabaseUrl,
  workerDatabaseUrl,
} from "../../src/server/database-config";
import {
  googleAuthReady,
  validateGoogleIdentity,
} from "../../src/server/google-auth";
const { findUser, policy } = vi.hoisted(() => ({
  findUser: vi.fn(),
  policy: vi.fn(),
}));
vi.mock("../../src/server/db", () => ({
  db: { user: { findUnique: findUser } },
}));
vi.mock("../../src/server/admin/policies", () => ({ controls: policy }));
beforeEach(() => {
  vi.stubEnv("GOOGLE_CLIENT_ID", "test-only-google.apps.googleusercontent.com");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-only-google-client-secret");
  vi.stubEnv("APP_URL", "http://localhost:3000");
  findUser.mockReset().mockResolvedValue(null);
  policy.mockReset().mockResolvedValue({ pauseSignup: false });
});
afterEach(() => vi.unstubAllEnvs());

it("requires a complete Google configuration and public HTTPS/challenge", () => {
  expect(googleAuthReady()).toBe(true);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
  expect(googleAuthReady()).toBe(false);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-only-google-client-secret");
  vi.stubEnv("APP_URL", "https://fixture.example");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "");
  expect(googleAuthReady()).toBe(false);
});

it("requires verified identities and honors signup pause without locking out existing users", async () => {
  await expect(
    validateGoogleIdentity({
      email: "fixture@example.test",
      emailVerified: false,
    }),
  ).resolves.toEqual({ error: "email_not_verified" });
  policy.mockResolvedValue({ pauseSignup: true });
  await expect(
    validateGoogleIdentity({
      email: "fixture@example.test",
      emailVerified: true,
    }),
  ).resolves.toEqual({ error: "signup_paused" });
  findUser.mockResolvedValue({
    id: "fixture",
    role: "user",
    twoFactorEnabled: false,
    emailVerified: true,
    status: "active",
    suspendedUntil: null,
  });
  await expect(
    validateGoogleIdentity(
      { email: "fixture@example.test", emailVerified: true },
      "fixture",
    ),
  ).resolves.toBeUndefined();
  expect(findUser).toHaveBeenLastCalledWith({ where: { id: "fixture" } });
});

it("prevents social login from bypassing suspension, staff protection or MFA", async () => {
  const user = {
    role: "user",
    twoFactorEnabled: false,
    emailVerified: true,
    status: "active",
    suspendedUntil: null,
  };
  for (const override of [
    { role: "owner" },
    { role: "admin" },
    { twoFactorEnabled: true },
  ]) {
    findUser.mockResolvedValue({ ...user, ...override });
    await expect(
      validateGoogleIdentity({
        email: "fixture@example.test",
        emailVerified: true,
      }),
    ).resolves.toEqual({ error: "credential_login_required" });
  }
  findUser.mockResolvedValue({ ...user, status: "suspended" });
  await expect(
    validateGoogleIdentity({
      email: "fixture@example.test",
      emailVerified: true,
    }),
  ).resolves.toEqual({ error: "account_unavailable" });
  findUser.mockResolvedValue({ ...user, emailVerified: false });
  await expect(
    validateGoogleIdentity({
      email: "fixture@example.test",
      emailVerified: true,
    }),
  ).resolves.toEqual({ error: "account_not_linked" });
});

it("keeps migrations/backups and session-based queue connections off transaction poolers", () => {
  vi.stubEnv("DATABASE_DIRECT_URL", "postgresql://fixture@db.example/direct");
  vi.stubEnv("DATABASE_WORKER_URL", "");
  expect(workerDatabaseUrl()).toBe(directDatabaseUrl());
  vi.stubEnv(
    "DATABASE_WORKER_URL",
    "postgresql://fixture@session.example/direct",
  );
  expect(workerDatabaseUrl()).toContain("session.example");
});

it("rejects a local deployment and accepts complete hosted configuration without proving connectivity", () => {
  expect(
    hostedConfigurationIssues().some((issue) => issue.startsWith("APP_URL:")),
  ).toBe(true);
  const values = {
    APP_URL: "https://fixture.example",
    DATABASE_URL: "postgresql://fixture@db.railway.internal/buatin",
    DATABASE_DIRECT_URL: "",
    DATABASE_WORKER_URL: "",
    ADMIN_REQUIRE_2FA: "true",
    EMAIL_PROVIDER: "resend",
    EMAIL_FROM: "Buatin <no-reply@fixture.example>",
    RESEND_API_KEY: "test-only-resend",
    TURNSTILE_SITE_KEY: "test-only-site",
    TURNSTILE_SECRET_KEY: "test-only-secret",
    MOCK_LLM: "false",
    LLM_BASE_URL: "https://router.fixture.example/v1",
    LLM_AUTH_MODE: "header",
    NINEROUTER_API_KEY: "test-only-router",
    LLM_MODEL_PLANNER: "fixture",
    LLM_MODEL_WRITER: "fixture",
    LLM_DAILY_BUDGET_USD: "1",
    LLM_INPUT_USD_PER_MILLION: "1",
    LLM_OUTPUT_USD_PER_MILLION: "1",
    REFERENCE_STORAGE: "s3",
    REFERENCE_S3_BUCKET: "fixture",
    REFERENCE_S3_ACCESS_KEY: "test-only-access",
    REFERENCE_S3_SECRET_KEY: "test-only-storage",
    REFERENCE_S3_ENDPOINT: "https://storage.fixture.example",
    SUPPORT_EMAIL: "support@fixture.example",
  };
  for (const [key, value] of Object.entries(values)) vi.stubEnv(key, value);
  expect(hostedConfigurationIssues()).toEqual([]);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
  vi.stubEnv("RESEND_API_KEY", "");
  expect(hostedConfigurationIssues("operations")).toEqual([]);
  expect(
    hostedConfigurationIssues().some((issue) => issue.startsWith("AUTH:")),
  ).toBe(true);
  expect(
    hostedConfigurationIssues().some((issue) => issue.startsWith("GOOGLE:")),
  ).toBe(true);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-only-google-client-secret");
  vi.stubEnv("RESEND_API_KEY", values.RESEND_API_KEY);
  vi.stubEnv("DATABASE_WORKER_URL", "postgresql://fixture@localhost/buatin");
  expect(hostedConfigurationIssues()).toEqual([
    "DATABASE_WORKER_URL: gunakan PostgreSQL produksi, bukan loopback.",
  ]);
  vi.stubEnv(
    "DATABASE_WORKER_URL",
    "postgresql://fixture@pooler.example:6543/postgres",
  );
  expect(hostedConfigurationIssues()).toEqual([
    "DATABASE_WORKER_URL: migration/lock memerlukan koneksi direct/session, bukan transaction pooler.",
  ]);
});

it("never renders provider error descriptions or arbitrary callback text", () => {
  expect(googleLoginError("<script>alert(1)</script>")).not.toContain(
    "<script>",
  );
  expect(googleLoginError("credential_login_required")).toContain(
    "autentikator",
  );
});

it("caps Vercel payloads and per-instance database connections without changing worker limits", () => {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("DATABASE_POOL_MAX", "10");
  vi.stubEnv("MAX_REFERENCE_DOCUMENT_BYTES", "10485760");
  vi.stubEnv("MAX_ARCHIVE_BYTES", "20971520");
  expect(getEnv()).toMatchObject({
    DATABASE_POOL_MAX: 3,
    MAX_REFERENCE_DOCUMENT_BYTES: 3145728,
    MAX_ARCHIVE_BYTES: 3145728,
  });
  vi.stubEnv("VERCEL", "");
  expect(getEnv().DATABASE_POOL_MAX).toBe(10);
  expect(getEnv().MAX_ARCHIVE_BYTES).toBe(20971520);
});
