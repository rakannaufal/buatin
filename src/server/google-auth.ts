import { getEnv } from "./config";
import { challengeReady } from "./challenge";
import { db } from "./db";
import { controls } from "./admin/policies";
import { suspended } from "../domain/admin";

export function googleConfigured() {
  const env = getEnv();
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function googleAuthReady() {
  return googleConfigured() && challengeReady();
}

export async function validateGoogleIdentity(
  user: {
    email?: string | null;
    emailVerified?: boolean;
  },
  userId?: string,
) {
  if (!googleAuthReady()) return { error: "google_not_configured" };
  if (!user.email || user.emailVerified !== true)
    return { error: "email_not_verified" };
  const existing = await db.user.findUnique({
    where: userId ? { id: userId } : { email: user.email.toLowerCase() },
  });
  if (existing) {
    if (suspended(existing)) return { error: "account_unavailable" };
    // The installed MFA plugin challenges credential sign-in only.
    if (existing.role !== "user" || existing.twoFactorEnabled)
      return { error: "credential_login_required" };
    if (!existing.emailVerified) return { error: "account_not_linked" };
  } else if ((await controls()).pauseSignup) {
    return { error: "signup_paused" };
  }
}
