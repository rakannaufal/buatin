"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, message } from "@/components/api";
import { Button, Notice } from "@/components/ui";
import type { ProductionCheck } from "@/server/operations";
type Report = {
  checks: ProductionCheck[];
  runtime: {
    ok: boolean;
    alerts: string[];
    metrics: {
      queued: number;
      running: number;
      freeDiskMb: number;
      dispatchAgeSeconds: number;
    };
    ai: {
      day: string;
      requests: number;
      tokens: number;
      estimatedUsd: number;
      pricingKnown: boolean;
      budgetUsd: number;
      requestLimit: number;
      tokenLimit: number;
    };
  };
  dataRequests: {
    id: string;
    kind: string;
    status: string;
    createdAt: string;
    user: { name: string; email: string } | null;
  }[];
};
export function OperationsPanel() {
  const report = useQuery({
    queryKey: ["operations"],
    queryFn: () => api<Report>("/admin/operations"),
    refetchInterval: 30000,
  });
  if (report.isPending)
    return <p role="status">Memuat pemeriksaan operasional...</p>;
  if (report.error)
    return <Notice tone="error">{message(report.error)}</Notice>;
  const { checks, runtime, dataRequests } = report.data;
  const gaps = checks.filter((check) => check.status !== "ready");
  const labels: Record<string, string> = {
    DEPENDENCY_UNHEALTHY: "Database atau worker bermasalah",
    DISK_LOW: "Ruang penyimpanan menipis",
    OUTBOX_STALLED: "Pengiriman antrean tertunda",
    EMAIL_DELIVERY_FAILED: "Email gagal dikirim",
    PAYMENT_REVIEW_REQUIRED: "Pembayaran perlu diperiksa",
  };
  return (
    <section
      aria-labelledby="operations-checks-heading"
      className="operations-section"
    >
      <div className="field-label-row">
        <h2 id="operations-checks-heading">Prioritas peluncuran</h2>
        <Button
          variant="secondary"
          busy={report.isFetching}
          onClick={() => void report.refetch()}
        >
          Periksa ulang
        </Button>
      </div>
      <p>
        {gaps.length} pemeriksaan masih perlu dituntaskan. Hosting dan database
        produksi disiapkan terpisah.
      </p>
      {runtime.alerts.length > 0 && (
        <Notice tone="error">
          {runtime.alerts.map((alert) => labels[alert] ?? alert).join(". ")}
        </Notice>
      )}
      <dl className="limits-list">
        <div>
          <dt>Antrean / proses aktif</dt>
          <dd>
            {runtime.metrics.queued} / {runtime.metrics.running}
          </dd>
        </div>
        <div>
          <dt>Disk aplikasi tersedia</dt>
          <dd>{runtime.metrics.freeDiskMb.toLocaleString("id-ID")} MiB</dd>
        </div>
        <div>
          <dt>Request AI nyata hari ini (UTC)</dt>
          <dd>
            {runtime.ai.requests} / {runtime.ai.requestLimit}
          </dd>
        </div>
        <div>
          <dt>Token ditagihkan / dicadangkan</dt>
          <dd>
            {runtime.ai.tokens.toLocaleString("id-ID")} /{" "}
            {runtime.ai.tokenLimit.toLocaleString("id-ID")}
          </dd>
        </div>
        <div>
          <dt>Estimasi biaya AI hari ini</dt>
          <dd>
            {runtime.ai.budgetUsd && runtime.ai.pricingKnown
              ? `$${runtime.ai.estimatedUsd.toFixed(4)} / $${runtime.ai.budgetUsd}`
              : "Tarif / batas USD belum dikonfigurasi"}
          </dd>
        </div>
      </dl>
      <p className="muted">
        Biaya memakai tarif operator dan cadangan untuk request tanpa usage.
        Tagihan final mengikuti provider.
      </p>
      <div className="table-scroll">
        <table className="projects-table">
          <thead>
            <tr>
              <th>Prioritas</th>
              <th>Kebutuhan</th>
              <th>Tindakan</th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((check) => (
              <tr key={check.id}>
                <td>{check.priority}</td>
                <td>
                  <strong>{check.label}</strong>
                  <small className="muted">
                    {check.status === "manual"
                      ? "Perlu verifikasi operator"
                      : "Belum siap"}
                  </small>
                </td>
                <td>{check.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Permintaan data pengguna</h3>
      <p className="muted">
        Verifikasi dan penuhi permintaan sesuai runbook privasi sebelum menandai
        selesai. Perubahan status tidak menghapus data atau mengirim salinan
        otomatis.
      </p>
      {!dataRequests.length ? (
        <p>Belum ada permintaan yang menunggu.</p>
      ) : (
        <ul className="account-session-list">
          {dataRequests.map((request) => (
            <li key={request.id}>
              <div>
                <strong>
                  {request.kind === "export"
                    ? "Salinan data"
                    : "Penghapusan data"}
                </strong>
                <p className="breakable-value">
                  {request.user?.email ?? "Akun sudah dihapus"}
                </p>
                <small>
                  {new Date(request.createdAt).toLocaleDateString("id-ID")} ·{" "}
                  {request.status === "open" ? "Menunggu" : "Ditinjau"}
                </small>
              </div>
              <Link className="button button-secondary" href="/admin/privacy">
                Tinjau dan catat bukti
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
