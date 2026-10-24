import { betterAuth } from "better-auth";
import { google, verifyGoogleIdToken } from "better-auth/social-providers";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getEnv } from "./config";
import { db } from "./db";
import { queueEmail } from "./email";
import { twoFactor } from "better-auth/plugins/two-factor";
import { APIError } from "better-auth/api";
import { suspended } from "../domain/admin";
import { googleConfigured, validateGoogleIdentity } from "./google-auth";
import { controls } from "./admin/policies";
export function createAuth(bootstrap = false) {
  const env = getEnv();
  const googleOptions = {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    prompt: "select_account" as const,
  };
  const googleProvider = google(googleOptions);
  return betterAuth({
    database: prismaAdapter(db, { provider: "postgresql" }),
    databaseHooks: {
      account: {
        create: {
          before: async (account) => {
            if (account.providerId === "google")
              return {
                data: {
                  ...account,
                  accessToken: null,
                  refreshToken: null,
                  idToken: null,
                },
              };
          },
        },
        update: {
          before: async (account) => {
            if (account.providerId === "google")
              return {
                data: {
                  ...account,
                  accessToken: null,
                  refreshToken: null,
                  idToken: null,
                },
              };
          },
        },
      },
      session: {
        create: {
          before: async (session, context) => {
            const user = await db.user.findUnique({
              where: { id: session.userId },
            });
            if (!user || suspended(user))
              throw new APIError("FORBIDDEN", {
                code: "account_unavailable",
                message: "Akun dibatasi. Hubungi bantuan untuk peninjauan.",
              });
            if (
              (context?.path?.startsWith("/callback/") ||
                context?.path === "/sign-in/social") &&
              (user.role !== "user" || user.twoFactorEnabled)
            )
              throw new APIError("FORBIDDEN", {
                code: "credential_login_required",
                message: "Gunakan email, password dan autentikator akun.",
              });
          },
        },
      },
    },
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: googleConfigured()
      ? {
          google: {
            ...googleOptions,
            getUserInfo: async (tokens) => {
              // This version's code callback decodes claims without verifying the ID token.
              if (
                !tokens.idToken ||
                !(await verifyGoogleIdToken({
                  token: tokens.idToken,
                  audience: env.GOOGLE_CLIENT_ID,
                }))
              )
                return null;
              return googleProvider.getUserInfo(tokens);
            },
          },
        }
      : {},
    account: {
      encryptOAuthTokens: true,
      storeStateStrategy: "database",
      accountLinking: {
        enabled: true,
        trustedProviders: [],
        allowDifferentEmails: false,
        updateUserInfoOnLink: false,
      },
    },
    onAPIError: { errorURL: `${env.APP_URL}/login` },
    plugins: [
      twoFactor({
        issuer: "Bantuin",
        backupCodeOptions: { storeBackupCodes: "encrypted" },
        accountLockout: {
          enabled: true,
          maxFailedAttempts: 5,
          durationSeconds: 900,
        },
      }),
    ],
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: !bootstrap,
      autoSignIn: bootstrap,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await queueEmail(
          user.email,
          "Atur ulang password Bantuin",
          `Buka tautan berikut untuk mengatur password baru:\n${url}\n\nAbaikan pesan ini jika Anda tidak meminta perubahan.`,
          `password:${url}`,
        );
      },
    },
    emailVerification: {
      sendOnSignUp: !bootstrap,
      autoSignInAfterVerification: false,
      expiresIn: 3600,
      sendVerificationEmail: async ({ user, url }) => {
        await queueEmail(
          user.email,
          "Verifikasi email Bantuin",
          `Verifikasi alamat email untuk memakai Bantuin:\n${url}\n\nTautan berlaku satu jam.`,
          `verify:${url}`,
        );
      },
    },
    user: {
      validateUserInfo: async ({ user, source }) => {
        if (source.method === "oauth") {
          if (source.oauth?.providerId !== "google")
            return { error: "oauth_provider_not_found" };
          return validateGoogleIdentity(
            user,
            source.action === "create-user" ? undefined : user.id,
          );
        }
        if (
          !bootstrap &&
          source.action === "create-user" &&
          (await controls()).pauseSignup
        )
          return { error: "signup_paused" };
      },
      additionalFields: {
        role: { type: "string", defaultValue: "user", input: false },
      },
    },
    trustedOrigins: [env.APP_URL],
    advanced: { useSecureCookies: env.APP_URL.startsWith("https:") },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 20 },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 12 },
  });
}
export const auth = createAuth();
