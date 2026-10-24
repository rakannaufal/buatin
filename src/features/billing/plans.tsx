"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, message } from "@/components/api";
import { Loading, Notice } from "@/components/ui";
import { planFeatures } from "@/domain/admin";
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
  const baseFeatures = [
    { label: "Jenis website", cell: () => "9" },
    { label: "Markdown + manifest", cell: () => "Hingga 43 + 1" },
    { label: "Preview, source, ZIP", cell: () => "Tersedia" },
    { label: "Lanjutkan proses yang sama", cell: () => "Tanpa kuota tambahan" },
    ...(
      [
        {
          key: "revisions",
          label: "Riwayat revisi brief & perbandingan hasil",
          available: "Tersedia",
        },
        {
          key: "regeneration",
          label: "Regenerasi dokumen terpilih",
          available: "1 kuota per proses",
        },
        {
          key: "presets",
          label: "Preset brief pribadi",
          available: "50 preset",
        },
        {
          key: "templates",
          label: "Template Markdown pribadi",
          available: "43 template",
        },
        {
          key: "batch",
          label: "Antrekan beberapa proyek",
          available: "Hingga 10 aktif",
        },
      ] as const
    ).map((feature) => ({
      label: feature.label,
      cell: (plan: CommercialPlan) =>
        planFeatures(plan.id, plan.features)[feature.key]
          ? feature.available
          : "Tidak",
    })),
    {
      label: "Prioritas antrean",
      cell: (plan: CommercialPlan) => String(plan.priority ?? 0),
    },
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
            {baseFeatures.map(({ label, cell }) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {plans.map((plan) => (
                  <td key={plan.id}>{cell(plan)}</td>
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
