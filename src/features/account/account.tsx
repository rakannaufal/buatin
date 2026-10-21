"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, patch, message } from "@/components/api";
import { Button, Loading, Notice } from "@/components/ui";
import Link from "next/link";
import type { AccountEntitlement } from "@/features/billing/types";
import { AccountSecurity } from "./security";
import { AccountPrivacy } from "./privacy";
export function AccountPage() {
  const query = useQuery({
    queryKey: ["account"],
    queryFn: () =>
      api<{
        user: {
          name: string;
          email: string;
          emailVerified: boolean;
          renewalReminders: boolean;
          twoFactorEnabled: boolean;
        };
        entitlement: AccountEntitlement;
      }>("/account"),
  });
  const client = useQueryClient();
  const update = useMutation({
    mutationFn: (data: { name: string; renewalReminders: boolean }) =>
      patch("/account", data),
    onSuccess: () => client.invalidateQueries({ queryKey: ["account"] }),
  });
  if (query.isPending) return <Loading />;
  if (query.isError)
    return <Notice tone="error">{message(query.error)}</Notice>;
  const { user, entitlement } = query.data;
  return (
    <>
      <div className="page-heading compact">
        <div>
          <h1>Akun Anda.</h1>
          <p>Profil, keamanan, dan pengingat langganan.</p>
        </div>
      </div>
      <section className="panel account-panel">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            update.mutate({
              name: String(data.get("name")),
              renewalReminders: data.get("reminders") === "on",
            });
          }}
        >
          <div className="field">
            <label htmlFor="profile-name">Nama</label>
            <input
              id="profile-name"
              name="name"
              defaultValue={user.name}
              required
              maxLength={100}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email terverifikasi</label>
            <input
              id="profile-email"
              value={user.email}
              readOnly
              type="email"
            />
          </div>
          <label className="check-row">
            <input
              type="checkbox"
              name="reminders"
              defaultChecked={user.renewalReminders}
            />
            <span>Kirim pengingat sebelum paket berakhir</span>
          </label>
          <p className="muted">
            Perpanjangan selalu manual melalui QRIS. Pengingat tidak
            mengaktifkan tagihan otomatis.
          </p>
          {update.error && (
            <Notice tone="error">{message(update.error)}</Notice>
          )}
          {update.isSuccess && <p role="status">Profil tersimpan.</p>}
          <Button type="submit" busy={update.isPending}>
            Simpan profil
          </Button>
        </form>
        <hr />
        <h2>Keamanan</h2>
        <p>
          <Link className="text-button" href="/forgot-password">
            Atur ulang password melalui email
          </Link>
          . Semua sesi lama dicabut setelah password diubah.
        </p>
        <AccountSecurity enabled={user.twoFactorEnabled} />
        <hr />
        <AccountPrivacy email={user.email} />
        <hr />
        <h2>{entitlement.name}</h2>
        <p>
          {entitlement.plannerUsed} dari {entitlement.plannerLimit} penyusunan
          rencana periode ini. Batas ini terpisah dari kuota generasi.
        </p>
        <Link className="text-button" href="/billing">
          Kelola paket dan riwayat pembayaran
        </Link>
        <p className="login-hint">
          <Link href="/privacy">Kebijakan privasi</Link> ·{" "}
          <Link href="/terms">Ketentuan layanan</Link>
        </p>
      </section>
    </>
  );
}
