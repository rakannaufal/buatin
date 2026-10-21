import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getEnv } from "./config";
import { db } from "./db";
import { queueEmail } from "./email";
import { twoFactor } from "better-auth/plugins/two-factor";
export function createAuth(bootstrap = false) {
  const env = getEnv();
  return betterAuth({
    database: prismaAdapter(db, { provider: "postgresql" }),
    baseURL: env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    plugins: [
      twoFactor({
        issuer: "Buatin",
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
          "Atur ulang password Buatin",
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
          "Verifikasi email Buatin",
          `Verifikasi alamat email untuk memakai Buatin:\n${url}\n\nTautan berlaku satu jam.`,
          `verify:${url}`,
        );
      },
    },
    user: {
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
