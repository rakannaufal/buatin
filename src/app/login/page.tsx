import { LoginForm } from "@/features/auth/login";
import { getEnv } from "@/server/config";
import { googleAuthReady } from "@/server/google-auth";
import { googleLoginError } from "@/domain/auth";
export const dynamic = "force-dynamic";
export const metadata = { title: "Masuk", robots: { index: false } };
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <LoginForm
      googleReady={googleAuthReady()}
      siteKey={getEnv().TURNSTILE_SITE_KEY}
      initialError={googleLoginError(error)}
    />
  );
}
