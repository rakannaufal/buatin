"use client";
import { useState } from "react";
import Link from "next/link";
import { Button, Notice } from "@/components/ui";
import { Challenge } from "./challenge";

export function GoogleLogin({
  siteKey,
  signup = false,
}: {
  siteKey: string;
  signup?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  async function signIn() {
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-turnstile-token": token,
        },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "/dashboard",
          errorCallbackURL: "/login",
          disableRedirect: true,
        }),
      });
      if (!response.ok) {
        setError(
          response.status === 429
            ? "Terlalu banyak percobaan. Tunggu satu menit lalu coba kembali."
            : response.status === 503
              ? "Login Google belum tersedia. Coba kembali nanti atau gunakan email."
              : "Permintaan ditolak. Selesaikan verifikasi keamanan lalu coba kembali.",
        );
        return;
      }
      const result: { url?: unknown } = await response.json();
      const url = typeof result.url === "string" ? new URL(result.url) : null;
      if (
        !url ||
        url.origin !== "https://accounts.google.com" ||
        url.pathname !== "/o/oauth2/v2/auth"
      )
        throw new Error("Invalid authorization destination");
      window.location.assign(url.href);
    } catch {
      setError(
        "Tidak dapat membuka Google. Periksa koneksi lalu coba kembali.",
      );
    } finally {
      setBusy(false);
      setAttempt((value) => value + 1);
    }
  }
  return (
    <div className="google-login">
      {error && <Notice tone="error">{error}</Notice>}
      <Challenge siteKey={siteKey} onToken={setToken} attempt={attempt} />
      <Button
        type="button"
        variant="secondary"
        className="full-width"
        busy={busy}
        onClick={signIn}
      >
        {!busy && (
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M43.61 24.46c0-1.36-.12-2.66-.35-3.91H24v7.4h11a9.4 9.4 0 0 1-4.08 6.18v5.14h6.61c3.87-3.56 6.08-8.8 6.08-14.81Z"
            />
            <path
              fill="#34A853"
              d="M24 44c5.5 0 10.1-1.82 13.46-4.94l-6.61-5.14c-1.83 1.23-4.17 1.97-6.85 1.97-5.3 0-9.8-3.58-11.41-8.4H5.77v5.29A20 20 0 0 0 24 44Z"
            />
            <path
              fill="#FBBC05"
              d="M12.59 27.49a12 12 0 0 1 0-6.98v-5.29H5.77a20 20 0 0 0 0 17.56l6.82-5.29Z"
            />
            <path
              fill="#EA4335"
              d="M24 12.11c3 0 5.67 1.03 7.8 3.05l5.85-5.85A19.6 19.6 0 0 0 24 4 20 20 0 0 0 5.77 15.22l6.82 5.29c1.61-4.82 6.11-8.4 11.41-8.4Z"
            />
          </svg>
        )}
        Lanjutkan dengan Google
      </Button>
      {signup && (
        <p className="login-hint">
          Dengan melanjutkan, Anda menyetujui{" "}
          <Link href="/terms">ketentuan layanan</Link> dan{" "}
          <Link href="/privacy">kebijakan privasi</Link>.
        </p>
      )}
      <p className="auth-divider">atau gunakan email</p>
    </div>
  );
}
