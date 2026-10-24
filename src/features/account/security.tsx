"use client";
import { useState } from "react";
import Image from "next/image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, post, message } from "@/components/api";
import { Button, Notice } from "@/components/ui";
export function AccountSecurity({ enabled }: { enabled: boolean }) {
  const client = useQueryClient();
  const [setup, setSetup] = useState<{
    qr: string;
    uri: string;
    codes: string[];
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const sessions = useQuery({
    queryKey: ["account-sessions"],
    queryFn: () =>
      api<{
        sessions: {
          id: string;
          current: boolean;
          createdAt: string;
          userAgent: string | null;
        }[];
      }>("/account/sessions"),
  });
  const enable = useMutation({
    mutationFn: async (password: string) => {
      const result = await post<{ totpURI: string; backupCodes: string[] }>(
        "/auth/two-factor/enable",
        { password },
      );
      const { toDataURL } = await import("qrcode");
      setSetup({
        uri: result.totpURI,
        codes: result.backupCodes,
        qr: await toDataURL(result.totpURI, { width: 256, margin: 4 }),
      });
      setSaved(false);
    },
  });
  const verify = useMutation({
    mutationFn: (code: string) =>
      post("/auth/two-factor/verify-totp", { code }),
    onSuccess: () => {
      setSetup(null);
      void client.invalidateQueries({ queryKey: ["account"] });
      void client.invalidateQueries({ queryKey: ["account-sessions"] });
    },
  });
  const disable = useMutation({
    mutationFn: (password: string) =>
      post("/auth/two-factor/disable", { password }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["account"] });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) =>
      api<{ current: boolean }>(`/account/sessions/${encodeURIComponent(id)}`, {
        method: "DELETE",
      }),
    onSuccess: (result) => {
      if (result.current) window.location.assign("/login");
      else void sessions.refetch();
    },
  });
  const error = enable.error || verify.error || disable.error || revoke.error;
  return (
    <section aria-labelledby="account-security-heading">
      <h2 id="account-security-heading">Autentikasi dua faktor</h2>
      <p>
        {enabled
          ? "Aktif. Kode aplikasi autentikator diperlukan saat masuk."
          : "Tambahkan kode aplikasi autentikator. Wajib untuk operator pada domain publik."}
      </p>
      {error && <Notice tone="error">{message(error)}</Notice>}
      {!setup && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const password = String(
              new FormData(form).get("security-password"),
            );
            if (enabled) disable.mutate(password);
            else enable.mutate(password);
            form.reset();
          }}
        >
          <div className="field">
            <label htmlFor="security-password">
              Password akun untuk {enabled ? "menonaktifkan" : "mengaktifkan"}{" "}
              dua faktor
            </label>
            <input
              id="security-password"
              name="security-password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            busy={enable.isPending || disable.isPending}
          >
            {enabled ? "Nonaktifkan dua faktor" : "Siapkan dua faktor"}
          </Button>
        </form>
      )}
      {setup && (
        <div className="two-factor-setup">
          <p>
            Pindai dengan aplikasi autentikator. Simpan kode pemulihan pada
            tempat privat sebelum melanjutkan; setiap kode hanya sekali pakai.
          </p>
          <Image
            src={setup.qr}
            alt="Kode QR pengaturan autentikator Bantuin"
            width={256}
            height={256}
            unoptimized
          />
          <details>
            <summary>Tampilkan kunci pengaturan manual</summary>
            <code className="breakable-value">
              {new URL(setup.uri).searchParams.get("secret")}
            </code>
          </details>
          <pre aria-label="Kode pemulihan dua faktor">
            {setup.codes.join("\n")}
          </pre>
          <label className="check-row">
            <input
              type="checkbox"
              checked={saved}
              onChange={(event) => setSaved(event.target.checked)}
            />
            <span>Kode pemulihan sudah disimpan dengan aman</span>
          </label>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              verify.mutate(
                String(new FormData(event.currentTarget).get("setup-code")),
              );
            }}
          >
            <div className="field">
              <label htmlFor="setup-code">Kode autentikator 6 digit</label>
              <input
                id="setup-code"
                name="setup-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                required
                maxLength={6}
              />
            </div>
            <Button type="submit" disabled={!saved} busy={verify.isPending}>
              Verifikasi dan aktifkan
            </Button>
          </form>
        </div>
      )}
      {verify.isSuccess && (
        <p role="status">Dua faktor aktif. Sesi lain sudah dicabut.</p>
      )}
      {disable.isSuccess && (
        <p role="status">
          Dua faktor dinonaktifkan. Akses operator publik memerlukan pengaktifan
          kembali.
        </p>
      )}
      <h3>Sesi aktif</h3>
      {sessions.isPending && <p role="status">Memuat sesi akun...</p>}
      {sessions.error && (
        <Notice tone="error">{message(sessions.error)}</Notice>
      )}
      <ul className="account-session-list">
        {sessions.data?.sessions.map((session) => (
          <li key={session.id}>
            <div>
              <strong>{session.current ? "Perangkat ini" : "Sesi lain"}</strong>
              <p className="muted breakable-value">
                {session.userAgent || "Informasi perangkat tidak tersedia"}
              </p>
              <small>
                {new Date(session.createdAt).toLocaleString("id-ID")}
              </small>
            </div>
            <Button
              variant="secondary"
              busy={revoke.isPending && revoke.variables === session.id}
              onClick={() => revoke.mutate(session.id)}
            >
              {session.current ? "Keluar" : "Cabut sesi"}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
