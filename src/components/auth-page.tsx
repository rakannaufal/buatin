import { PublicAuthForm } from "@/features/auth/public-auth";
import { getEnv } from "@/server/config";
import { publicAuthReady, localApp } from "@/server/challenge";
import { googleAuthReady } from "@/server/google-auth";
export function AuthPage({
  mode,
  token,
}: {
  mode: "signup" | "forgot" | "reset" | "verify";
  token?: string;
}) {
  return (
    <PublicAuthForm
      mode={mode}
      token={token}
      siteKey={getEnv().TURNSTILE_SITE_KEY}
      ready={publicAuthReady()}
      localEmail={localApp() && getEnv().EMAIL_PROVIDER === "local"}
      googleReady={googleAuthReady()}
    />
  );
}
