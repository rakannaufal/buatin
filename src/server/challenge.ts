import { z } from "zod";
import { getEnv } from "./config";
import { AppError } from "./errors";

export function localApp() {
  return ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(getEnv().APP_URL).hostname,
  );
}
export function publicAuthReady() {
  const env = getEnv();
  return (
    localApp() ||
    Boolean(
      challengeReady() &&
      env.EMAIL_PROVIDER === "resend" &&
      env.RESEND_API_KEY &&
      env.EMAIL_FROM !== "Buatin <noreply@example.com>" &&
      env.TURNSTILE_SITE_KEY &&
      env.TURNSTILE_SECRET_KEY,
    )
  );
}
export function challengeReady() {
  const env = getEnv();
  return (
    localApp() ||
    Boolean(
      env.APP_URL.startsWith("https://") &&
      env.TURNSTILE_SITE_KEY &&
      env.TURNSTILE_SECRET_KEY,
    )
  );
}
export async function verifyChallenge(token: unknown, email = true) {
  const env = getEnv();
  if (!(email ? publicAuthReady() : challengeReady()))
    throw new AppError(
      "AUTH_NOT_CONFIGURED",
      503,
      "Pendaftaran publik belum dikonfigurasi pengelola.",
    );
  if (!env.TURNSTILE_SECRET_KEY && localApp()) return;
  if (typeof token !== "string" || !token || token.length > 2048)
    throw new AppError(
      "CHALLENGE_REQUIRED",
      400,
      "Selesaikan verifikasi keamanan.",
    );
  let result;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        signal: AbortSignal.timeout(10000),
        redirect: "error",
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
        }),
      },
    );
    result = z
      .object({ success: z.boolean(), hostname: z.string().optional() })
      .parse(await response.json());
  } catch {
    throw new AppError(
      "CHALLENGE_UNAVAILABLE",
      503,
      "Verifikasi keamanan belum tersedia. Coba kembali.",
    );
  }
  if (!result.success || result.hostname !== new URL(env.APP_URL).hostname)
    throw new AppError(
      "CHALLENGE_FAILED",
      400,
      "Verifikasi keamanan kedaluwarsa. Coba kembali.",
    );
}
