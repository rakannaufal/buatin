"use client";
import { useMutation } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Button, Notice } from "@/components/ui";
import { message } from "@/components/api";
import { rupiah } from "@/domain/billing";
import {
  DataTable,
  Field,
  QueryState,
  SectionHeading,
  useAdminData,
} from "./shared";
type Report = {
  from: string;
  to: string;
  paid: { count: number; amount: number; subtotal: number; discount: number };
  refunds: { amount: number; count: number };
  netAfterRefunds: number;
  newUsers: number;
  activePaidAccounts: number;
  jobs: { status: string; count: number }[];
  ai: {
    unpriced: number;
    attempts: number;
    tokensIn: number | null;
    tokensOut: number | null;
    estimatedCostMicros: string;
  };
};
export function ReportsAdmin() {
  const query = useAdminData<Report>("reports"),
    search = useSearchParams();
  const exportCsv = useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch(`/api/admin/reports/export?${search}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok)
        throw new Error(
          (await response.json()).error?.message ?? "Ekspor gagal.",
        );
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "buatin-payments.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });
  return (
    <>
      <SectionHeading
        section="reports"
        description="Pembayaran terkonfirmasi, diskon, refund serta estimasi penggunaan. Rentang tanggal UTC."
      />
      <form className="admin-filters" action="/admin/reports">
        <Field
          name="from"
          label="Dari tanggal UTC"
          type="date"
          value={search.get("from") ?? ""}
        />
        <Field
          name="to"
          label="Sampai tanggal UTC"
          type="date"
          value={search.get("to") ?? ""}
        />
        <Button variant="secondary">Tampilkan laporan</Button>
      </form>
      <QueryState pending={query.isPending} error={query.error} />
      {query.data && (
        <>
          <div className="admin-metrics">
            {[
              {
                label: "Pembayaran diterima",
                value: rupiah(query.data.paid.amount),
              },
              {
                label: "Diskon diberikan",
                value: rupiah(query.data.paid.discount),
              },
              {
                label: "Refund selesai",
                value: rupiah(query.data.refunds.amount),
              },
              {
                label: "Penerimaan setelah refund",
                value: rupiah(query.data.netAfterRefunds),
              },
              {
                label: "Akun baru pada rentang",
                value: String(query.data.newUsers),
              },
              {
                label: "Akun berbayar aktif saat ini",
                value: String(query.data.activePaidAccounts),
              },
            ].map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
          <p className="muted">
            {query.data.paid.count} pembayaran; {query.data.refunds.count}{" "}
            refund. Penerimaan belum dikurangi biaya gateway, pajak,
            infrastruktur atau AI. Pembayaran dan refund mengikuti tanggal
            kejadian masing-masing.
          </p>
          <h2>Generasi pada rentang</h2>
          <DataTable
            items={query.data.jobs.map((item) => ({
              ...item,
              id: item.status,
            }))}
            columns={[
              { label: "Status", cell: (item) => item.status },
              { label: "Jumlah", cell: (item) => item.count },
            ]}
          />
          <h2>AI nyata</h2>
          <p>
            {query.data.ai.attempts} request; token input{" "}
            {query.data.ai.tokensIn ?? "belum diketahui"}; output{" "}
            {query.data.ai.tokensOut ?? "belum diketahui"}. Estimasi USD{" "}
            {Number(query.data.ai.estimatedCostMicros) > 0
              ? (Number(query.data.ai.estimatedCostMicros) / 1000000).toFixed(6)
              : "belum tersedia"}
            .{" "}
            {query.data.ai.unpriced > 0 &&
              `${query.data.ai.unpriced} request belum memiliki tarif; estimasi biaya belum lengkap.`}
          </p>
        </>
      )}
      <form
        className="admin-action-form"
        onSubmit={(event) => {
          event.preventDefault();
          exportCsv.mutate(
            String(new FormData(event.currentTarget).get("reason")),
          );
        }}
      >
        <h2>Ekspor invoice CSV</h2>
        <p>
          Maksimal 31 hari dan 1.000 invoice. Ekspor privat, teredaksi dan
          tercatat audit.
        </p>
        <Field name="reason" label="Alasan ekspor" required max={500} />
        {exportCsv.error && (
          <Notice tone="error">{message(exportCsv.error)}</Notice>
        )}
        <Button type="submit" busy={exportCsv.isPending}>
          Unduh CSV
        </Button>
      </form>
    </>
  );
}
