"use client";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { BookOpen, Eye, EyeOff } from "lucide-react";
import { Button, Folio, Notice } from "@/components/ui";
import { Challenge } from "./challenge";
type Mode = "signup" | "forgot" | "reset" | "verify";
const titles = {
  signup: "Buat ruang untuk ide Anda.",
  forgot: "Lupa password?",
  reset: "Password baru.",
  verify: "Verifikasi email Anda.",
};
export function PublicAuthForm({
  mode,
  siteKey,
  ready,
  localEmail,
  token = "",
}: {
  mode: Mode;
  siteKey: string;
  ready: boolean;
  localEmail: boolean;
  token?: string;
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [challengeToken, setChallengeToken] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [show, setShow] = useState(false);
  const schema = z
    .object({
      name:
        mode === "signup"
          ? z.string().trim().min(1, "Isi nama Anda.").max(100)
          : z.string(),
      email:
        mode !== "reset" ? z.email("Masukkan email yang valid.") : z.string(),
      password: ["signup", "reset"].includes(mode)
        ? z.string().min(12, "Minimal 12 karakter.").max(128)
        : z.string(),
      confirmation: z.string(),
    })
    .refine(
      (values) => mode !== "reset" || values.password === values.confirmation,
      { path: ["confirmation"], message: "Konfirmasi password belum sama." },
    );
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmation: "" },
  });
  async function submit(values: z.infer<typeof schema>) {
    setError("");
    try {
      const endpoint = {
        signup: "sign-up/email",
        forgot: "request-password-reset",
        reset: "reset-password",
        verify: "send-verification-email",
      }[mode];
      const input =
        mode === "signup"
          ? {
              name: values.name,
              email: values.email,
              password: values.password,
              callbackURL: `${location.origin}/login?verified=1`,
            }
          : mode === "reset"
            ? { token, newPassword: values.password }
            : mode === "forgot"
              ? {
                  email: values.email,
                  redirectTo: `${location.origin}/reset-password`,
                }
              : {
                  email: values.email,
                  callbackURL: `${location.origin}/login?verified=1`,
                };
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-turnstile-token": challengeToken,
        },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        setError(
          mode === "reset"
            ? "Tautan tidak valid atau sudah kedaluwarsa. Minta tautan baru."
            : response.status === 429
              ? "Terlalu banyak percobaan. Tunggu satu menit."
              : "Permintaan belum berhasil. Periksa isian dan verifikasi keamanan.",
        );
        setAttempt((value) => value + 1);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Tidak dapat terhubung. Periksa koneksi Anda.");
      setAttempt((value) => value + 1);
    }
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <Link className="brand" href="/">
          <BookOpen size={25} />
          <span>Buatin</span>
        </Link>
        <div className="login-intro">
          <Folio />
          <h1>
            Ide yang baik
            <br />
            layak punya <em>rencana.</em>
          </h1>
          <p>
            Mulai dari brief. Bawa pulang spesifikasi yang bisa ditinjau,
            dibagikan, dan dikerjakan.
          </p>
        </div>
        <span className="login-footnote">
          Dokumen proyek hanya tersedia untuk akun Anda.
        </span>
      </section>
      <section className="login-panel">
        <div className="login-form">
          <h2>{titles[mode]}</h2>
          <p className="muted">
            {mode === "signup"
              ? "Free: satu generasi per akun, tanpa pembayaran."
              : "Tautan dikirim ke alamat email terdaftar."}
          </p>
          {localEmail && (
            <Notice tone="info">
              Mode pengembangan. Email belum dikirim ke internet.
            </Notice>
          )}
          {!ready && mode !== "reset" && (
            <Notice>
              Pendaftaran dan pengiriman email belum diaktifkan pengelola.
            </Notice>
          )}
          {error && <Notice tone="error">{error}</Notice>}
          {success ? (
            <Notice tone="info">
              {mode === "reset"
                ? "Password diperbarui. Silakan masuk dengan password baru."
                : "Jika alamat email memenuhi syarat, tautan sudah disiapkan. Periksa email dan folder spam."}{" "}
              <Link href="/login" className="text-button">
                Buka halaman masuk
              </Link>
            </Notice>
          ) : (
            <form onSubmit={form.handleSubmit(submit)} noValidate>
              {mode === "signup" && (
                <div className="field">
                  <label htmlFor="name">Nama</label>
                  <input
                    id="name"
                    autoComplete="name"
                    {...form.register("name")}
                    aria-invalid={!!form.formState.errors.name}
                  />
                  <span className="field-error">
                    {form.formState.errors.name?.message}
                  </span>
                </div>
              )}
              {mode !== "reset" && (
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...form.register("email")}
                    aria-invalid={!!form.formState.errors.email}
                  />
                  <span className="field-error">
                    {form.formState.errors.email?.message}
                  </span>
                </div>
              )}
              {["signup", "reset"].includes(mode) && (
                <div className="field">
                  <label htmlFor="password">Password</label>
                  <div className="password-field">
                    <input
                      id="password"
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      {...form.register("password")}
                      aria-invalid={!!form.formState.errors.password}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={
                        show ? "Sembunyikan password" : "Tampilkan password"
                      }
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <small className="muted">Gunakan minimal 12 karakter.</small>
                  <span className="field-error">
                    {form.formState.errors.password?.message}
                  </span>
                </div>
              )}
              {mode === "reset" && (
                <div className="field">
                  <label htmlFor="confirmation">Konfirmasi password</label>
                  <input
                    id="confirmation"
                    type="password"
                    autoComplete="new-password"
                    {...form.register("confirmation")}
                    aria-invalid={!!form.formState.errors.confirmation}
                  />
                  <span className="field-error">
                    {form.formState.errors.confirmation?.message}
                  </span>
                </div>
              )}
              {mode !== "reset" && (
                <Challenge
                  siteKey={siteKey}
                  onToken={setChallengeToken}
                  attempt={attempt}
                />
              )}
              <Button
                type="submit"
                className="full-width"
                busy={form.formState.isSubmitting}
                disabled={
                  (mode !== "reset" && !ready) || (mode === "reset" && !token)
                }
              >
                {mode === "signup"
                  ? "Buat akun gratis"
                  : mode === "reset"
                    ? "Simpan password baru"
                    : "Kirim tautan email"}
              </Button>
              {mode === "signup" && (
                <p className="login-hint">
                  Dengan mendaftar, Anda menyetujui{" "}
                  <Link href="/terms">ketentuan layanan</Link> dan{" "}
                  <Link href="/privacy">kebijakan privasi</Link>. Verifikasi
                  email diperlukan sebelum memakai Free.
                </p>
              )}
            </form>
          )}
          <p className="login-hint">
            Sudah punya akun?{" "}
            <Link className="text-button" href="/login">
              Masuk
            </Link>
            {mode !== "verify" && (
              <>
                {" "}
                ·{" "}
                <Link className="text-button" href="/verify-email">
                  Kirim ulang verifikasi
                </Link>
              </>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
