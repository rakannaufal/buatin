"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, ArrowRight, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { Button, Folio, Notice } from "@/components/ui";
const schema = z.object({
  email: z.email("Masukkan alamat email yang valid."),
  password: z.string().min(1, "Masukkan password."),
});
export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [challenge, setChallenge] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const codeInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (challenge) codeInput.current?.focus();
  }, [challenge, recovery]);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  async function submit(values: z.infer<typeof schema>) {
    setError("");
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        setError(
          response.status === 403
            ? "Email perlu diverifikasi sebelum masuk. Gunakan tautan kirim ulang verifikasi."
            : "Email atau password tidak sesuai, atau akses sementara dibatasi.",
        );
        return;
      }
      const result = await response.json();
      if (result.twoFactorRedirect) {
        form.resetField("password");
        setChallenge(true);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi lalu coba kembali.");
    }
  }
  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("mfa-code"));
    setVerifying(true);
    setError("");
    try {
      const response = await fetch(
        `/api/auth/two-factor/${recovery ? "verify-backup-code" : "verify-totp"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, trustDevice: false }),
        },
      );
      if (!response.ok) {
        setError(
          "Kode tidak valid atau sesi verifikasi berakhir. Periksa kode lalu coba lagi; masuk kembali bila tetap gagal.",
        );
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi lalu coba kembali.");
    } finally {
      setVerifying(false);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <div className="brand">
          <BookOpen size={25} />
          <Link href="/">Buatin</Link>
        </div>
        <div className="login-intro">
          <Folio />
          <h1>
            Ide yang baik
            <br />
            layak punya <em>rencana.</em>
          </h1>
          <p>
            Susun brief. Pilih dokumen yang relevan. Mulai membangun dengan arah
            yang jelas.
          </p>
        </div>
        <span className="login-footnote">
          Ruang pribadi untuk merencanakan website.
        </span>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <span className="tiny-label">
            <LockKeyhole size={15} />
            Akun Buatin
          </span>
          <h2>Selamat datang kembali.</h2>
          <p className="muted">Masuk untuk melanjutkan rencana proyek Anda.</p>
          {error && <Notice tone="error">{error}</Notice>}
          {challenge ? (
            <form onSubmit={verify}>
              <p>Verifikasi dua faktor untuk menyelesaikan proses masuk.</p>
              <div className="field">
                <label htmlFor="mfa-code">
                  {recovery ? "Kode pemulihan" : "Kode autentikator 6 digit"}
                </label>
                <input
                  ref={codeInput}
                  key={String(recovery)}
                  id="mfa-code"
                  name="mfa-code"
                  autoComplete="one-time-code"
                  inputMode={recovery ? "text" : "numeric"}
                  pattern={recovery ? undefined : "[0-9]{6}"}
                  maxLength={recovery ? 64 : 6}
                  required
                />
              </div>
              <Button type="submit" busy={verifying} className="full-width">
                Verifikasi dan masuk
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => {
                  setRecovery(!recovery);
                  setError("");
                }}
              >
                {recovery
                  ? "Gunakan aplikasi autentikator"
                  : "Gunakan kode pemulihan"}
              </Button>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setChallenge(false);
                  setError("");
                }}
              >
                Kembali ke email dan password
              </button>
            </form>
          ) : (
            <form onSubmit={form.handleSubmit(submit)} noValidate>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  autoComplete="username"
                  type="email"
                  {...form.register("email")}
                  aria-invalid={!!form.formState.errors.email}
                  aria-describedby="email-error"
                />
                <span id="email-error" className="field-error">
                  {form.formState.errors.email?.message}
                </span>
              </div>
              <div className="field">
                <div className="field-label-row">
                  <label htmlFor="password">Password</label>
                  <Link className="text-button" href="/forgot-password">
                    Lupa password?
                  </Link>
                </div>
                <input
                  id="password"
                  autoComplete="current-password"
                  type="password"
                  {...form.register("password")}
                  aria-invalid={!!form.formState.errors.password}
                  aria-describedby="password-error"
                />
                <span id="password-error" className="field-error">
                  {form.formState.errors.password?.message}
                </span>
              </div>
              <Button
                type="submit"
                busy={form.formState.isSubmitting}
                className="full-width"
              >
                Masuk ke workspace
                <ArrowRight size={17} />
              </Button>
            </form>
          )}
          <p className="login-hint">
            Belum punya akun?{" "}
            <Link className="text-button" href="/signup">
              Daftar gratis
            </Link>
            <br />
            <Link className="text-button" href="/verify-email">
              Kirim ulang verifikasi email
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
