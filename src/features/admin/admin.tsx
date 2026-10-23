"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/components/api";
import { Notice } from "@/components/ui";
import { QueryState } from "./shared";
type Overview = {
  totalUsers: number;
  usage: {
    attempts: number | null;
    tokensIn: number | null;
    tokensOut: number | null;
  };
  readiness: {
    processingMode: "request" | "worker";
    processing: boolean;
    worker: boolean;
    payment: boolean;
    publicAuth: boolean;
    mock: boolean;
    emailFailures: number;
    unresolvedPayments: number;
  };
};
export function AdminPage() {
  const query = useQuery({
    queryKey: ["admin"],
    queryFn: () => api<Overview>("/admin"),
  });
  return (
    <>
      <div className="page-heading compact">
        <div>
          <h1>Kendali layanan.</h1>
          <p>Pengguna, penjualan, generasi dan kesiapan Buatin.</p>
        </div>
      </div>
      <QueryState pending={query.isPending} error={query.error} />
      {query.data && (
        <>
          <div className="admin-metrics">
            <div>
              <span>Total akun</span>
              <strong>{query.data.totalUsers}</strong>
            </div>
            <div>
              <span>Request AI tercatat</span>
              <strong>{query.data.usage.attempts ?? 0}</strong>
            </div>
            <div>
              <span>Transaksi perlu tinjau</span>
              <strong>{query.data.readiness.unresolvedPayments}</strong>
            </div>
            <div>
              <span>Email gagal</span>
              <strong>{query.data.readiness.emailFailures}</strong>
            </div>
          </div>
          <Notice tone={query.data.readiness.processing ? "info" : "error"}>
            Pemrosesan{" "}
            {query.data.readiness.processingMode === "request"
              ? "Vercel bertahap"
              : query.data.readiness.worker
                ? "terhubung"
                : "belum terhubung"}
            . AI {query.data.readiness.mock ? "mock" : "nyata"}. QRIS{" "}
            {query.data.readiness.payment ? "terkonfigurasi" : "belum siap"}.
            Pendaftaran publik{" "}
            {query.data.readiness.publicAuth ? "siap" : "belum siap"}.
          </Notice>
          <div className="admin-form-grid">
            {[
              {
                href: "/admin/users",
                title: "Akun dan akses",
                text: "Cari pengguna, tinjau pemakaian, kelola sesi, grant dan pembatasan.",
              },
              {
                href: "/admin/plans",
                title: "Harga dan paket",
                text: "Tinjau versi manfaat sebelum menerbitkan perubahan harga.",
              },
              {
                href: "/admin/vouchers",
                title: "Voucher dan promosi",
                text: "Atur kelayakan, periode serta batas pemakaian kode promosi.",
              },
              {
                href: "/admin/operations",
                title: "Prioritas peluncuran",
                text: "Periksa dependency, backup, biaya AI dan kebutuhan produksi.",
              },
            ].map((item) => (
              <section className="panel" key={item.href}>
                <h2>
                  <Link href={item.href}>{item.title}</Link>
                </h2>
                <p className="muted">{item.text}</p>
              </section>
            ))}
          </div>
        </>
      )}
    </>
  );
}
