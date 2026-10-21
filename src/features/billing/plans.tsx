"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, message } from "@/components/api";
import { Loading, Notice } from "@/components/ui";
import { rupiah } from "@/domain/billing";
import type { CommercialPlan } from "./types";

export function PlanComparison({
  plans,
  paymentReady,
  onChoose,
  busy,
}: {
  plans: CommercialPlan[];
  paymentReady: boolean;
  onChoose?: (id: CommercialPlan["id"]) => void;
  busy?: boolean;
}) {
  const features: [string, string, string, string, string][] = [
    ["Jenis website", "9", "9", "9", "9"],
    [
      "Markdown + manifest",
      "Hingga 42 + 1",
      "Hingga 42 + 1",
      "Hingga 42 + 1",
      "Hingga 42 + 1",
    ],
    ["Preview, source, ZIP", "Tersedia", "Tersedia", "Tersedia", "Tersedia"],
    [
      "Lanjutkan proses yang sama",
      "Tanpa kuota tambahan",
      "Tanpa kuota tambahan",
      "Tanpa kuota tambahan",
      "Tanpa kuota tambahan",
    ],
    [
      "Riwayat revisi brief & perbandingan hasil",
      "Tidak",
      "Tidak",
      "Tersedia",
      "Tersedia",
    ],
    [
      "Regenerasi dokumen terpilih",
      "Tidak",
      "Tidak",
      "1 kuota per proses",
      "1 kuota per proses",
    ],
    ["Preset brief pribadi", "Tidak", "Tidak", "50 preset", "50 preset"],
    ["Template Markdown pribadi", "Tidak", "Tidak", "Tidak", "42 template"],
    ["Antrekan beberapa proyek", "Tidak", "Tidak", "Tidak", "Hingga 10 aktif"],
    ["Prioritas antrean", "Standar", "Standar", "Lebih tinggi", "Tertinggi"],
  ];
  return (
    <>
      <p className="pricing-scroll-hint">
        Geser tabel ke samping untuk melihat semua paket.
      </p>
      <div
        className="table-scroll pricing-comparison"
        role="region"
        aria-label="Perbandingan paket Buatin"
        tabIndex={0}
      >
        <table>
          <caption className="sr-only">Perbandingan paket Buatin</caption>
          <thead>
            <tr>
              <th scope="col">Pilih ruang untuk ide Anda.</th>
              {plans.map((plan) => (
                <th
                  scope="col"
                  key={plan.id}
                  className={plan.id === "plus" ? "recommended-plan" : ""}
                >
                  <span>{plan.name}</span>
                  <strong>
                    {plan.id === "free"
                      ? "Gratis"
                      : plan.monthlyPrice
                        ? rupiah(plan.monthlyPrice)
                        : "Harga menyusul"}
                  </strong>
                  <small>
                    {plan.id === "free"
                      ? "Tanpa pembayaran"
                      : "per bulan, QRIS"}
                  </small>
                  {onChoose ? (
                    <button
                      className={`button button-${plan.id === "plus" ? "primary" : "secondary"}`}
                      disabled={
                        busy ||
                        plan.id === "free" ||
                        !paymentReady ||
                        !plan.available ||
                        !plan.monthlyPrice
                      }
                      onClick={() => onChoose(plan.id)}
                    >
                      {plan.id === "free"
                        ? "Paket dasar"
                        : !plan.available || !plan.monthlyPrice || !paymentReady
                          ? "Belum dijual"
                          : "Pilih paket"}
                    </button>
                  ) : (
                    <Link
                      href={plan.id === "free" ? "/signup" : "/billing"}
                      className={`button button-${plan.id === "plus" ? "primary" : "secondary"}`}
                    >
                      {plan.id === "free" ? "Mulai gratis" : "Lihat langganan"}
                    </Link>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Kuota generasi</th>
              {plans.map((plan) => (
                <td key={plan.id}>
                  <strong>{plan.weeklyQuota} kali</strong>
                  <br />
                  {plan.id === "free" ? "seumur hidup" : "per minggu"}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Penyimpanan hasil</th>
              {plans.map((plan) => (
                <td key={plan.id}>{plan.retentionDays} hari</td>
              ))}
            </tr>
            {features.map(([label, ...values]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {values.map((value, index) => (
                  <td key={index}>{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
export function PublicPricing() {
  const query = useQuery({
    queryKey: ["pricing"],
    queryFn: () =>
      api<{ plans: CommercialPlan[]; paymentReady: boolean }>("/pricing"),
  });
  if (query.isPending) return <Loading label="Memuat paket..." />;
  if (query.isError)
    return <Notice tone="error">{message(query.error)}</Notice>;
  return (
    <>
      <PlanComparison {...query.data} />
      <p className="pricing-note">
        Kuota Pro reset Senin 00.00 WIB selama masa aktif. Sisa kuota tidak
        menumpuk. Tagihan bulanan dibayar manual lewat QRIS; tidak ada
        autodebit. Free berlaku sekali per akun.
      </p>
    </>
  );
}
