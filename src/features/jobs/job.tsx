"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LoaderCircle,
  FileText,
  Square,
  RotateCcw,
  Download,
  Clock,
} from "lucide-react";
import {
  api,
  post,
  message,
  statusLabels,
  errorLabels,
} from "@/components/api";
import type { JobView } from "@/components/api-types";
import { Button, Loading, Notice, Modal } from "@/components/ui";
import { TERMINAL_STATUSES } from "@/domain/types";
export function useJob(id: string) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => api<{ job: JobView }>(`/jobs/${id}`),
    refetchInterval: (q) =>
      q.state.data && !TERMINAL_STATUSES.includes(q.state.data.job.status)
        ? q.state.data.job.workerReady === false
          ? 10000
          : q.state.status === "error"
            ? Math.min(15000, 2000 * 2 ** Math.min(q.state.errorUpdateCount, 3))
            : 2000
        : false,
  });
}
export function JobPage({ id }: { id: string }) {
  const query = useJob(id);
  const client = useQueryClient();
  const [key] = useState(() => crypto.randomUUID());
  const cancel = useMutation({
    mutationFn: () => post(`/jobs/${id}/cancel`),
    onSuccess: () => client.invalidateQueries({ queryKey: ["job", id] }),
  });
  const resume = useMutation({
    mutationFn: () =>
      post(`/jobs/${id}/resume`, {}, { "Idempotency-Key": key }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["job", id] }),
  });
  const close = useMutation({
    mutationFn: () => post(`/jobs/${id}/close`),
    onSuccess: () => client.invalidateQueries({ queryKey: ["job", id] }),
  });
  if (query.isPending) return <Loading />;
  if (!query.data) return <Notice tone="error">{message(query.error)}</Notice>;
  const job = query.data.job;
  const active = !TERMINAL_STATUSES.includes(job.status);
  const percent = Math.round((job.done / job.total) * 100);
  return (
    <>
      <Link href="/dashboard" className="back-link">
        <ArrowLeft size={15} />
        Ruang kerja
      </Link>
      <div className="page-heading compact">
        <div>
          <span className="tiny-label">{job.project.name}</span>
          <h1>
            {active
              ? "Rencana sedang ditulis."
              : job.status === "cancelled"
                ? "Proses dibatalkan."
                : job.status === "failed"
                  ? "Proses perlu dilanjutkan."
                  : "Dokumen siap ditinjau."}
          </h1>
          <p>
            Hasil disimpan per file. Anda dapat kembali ke halaman ini kapan
            saja.
          </p>
        </div>
        {job.done > 0 && job.status !== "cancelled" && (
          <Link className="button button-primary" href={`/jobs/${id}/result`}>
            Lihat hasil
            <ArrowRight size={17} />
          </Link>
        )}
      </div>
      {job.mock && (
        <Notice tone="info">
          Mode pengujian aktif. Dokumen inti disusun dari template; layanan
          eksternal memakai fixture pengujian.
        </Notice>
      )}
      {query.isError && (
        <Notice tone="error">
          Pembaruan status gagal. Menampilkan data terakhir yang tersimpan.{" "}
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Coba lagi
          </Button>
        </Notice>
      )}
      {active && job.workerReady === false && (
        <Notice>
          Layanan pemrosesan sementara terputus. Hasil yang sudah tersimpan
          tetap tersedia; status diperiksa kembali secara berkala.
        </Notice>
      )}
      {job.errorCode && (
        <Notice tone="error">
          {errorLabels[job.errorCode] ??
            "Proses belum selesai. Periksa koneksi atau konfigurasi layanan."}
        </Notice>
      )}
      {(cancel.error || resume.error || close.error) && (
        <Notice tone="error">
          {message(cancel.error ?? resume.error ?? close.error)}
        </Notice>
      )}
      {job.quotaRefundedAt && (
        <Notice tone="info">
          Kuota dikembalikan ke periode asal. Proses ini sudah ditutup.
        </Notice>
      )}
      <section className="progress-panel">
        <div className="progress-heading">
          <span className={`status-label status-${job.status}`}>
            <i />
            {statusLabels[job.status]}
          </span>
          <strong>
            {percent}
            <small>%</small>
          </strong>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label="Dokumen selesai"
          aria-valuemin={0}
          aria-valuemax={job.total}
          aria-valuenow={job.done}
        >
          <span style={{ width: `${percent}%` }} />
        </div>
        <div className="progress-meta">
          <p>
            <strong>{job.done}</strong> dari {job.total} Markdown selesai
            <span className="muted"> · manifest dibuat otomatis</span>
          </p>
          <span className="muted">
            <Clock size={14} />
            {new Intl.DateTimeFormat("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(job.createdAt))}
          </span>
        </div>
        <div className="progress-actions">
          {active && job.status !== "cancel_requested" && (
            <Modal
              title="Batalkan proses?"
              description="Dokumen yang sudah tersimpan tetap ada, tetapi job yang dibatalkan tidak dapat diekspor pada MVP."
              trigger={
                <Button variant="secondary">
                  <Square size={14} />
                  Batalkan
                </Button>
              }
            >
              <p>
                Panggilan AI yang sudah dikirim mungkin tetap dikenai biaya.
                Worker akan berhenti sebelum memulai request berikutnya.
              </p>
              <Button
                variant="danger"
                busy={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                Konfirmasi pembatalan
              </Button>
            </Modal>
          )}
          {job.status === "cancel_requested" && (
            <span role="status" className="muted">
              Menunggu worker mengonfirmasi pembatalan...
            </span>
          )}
          {["failed", "partial"].includes(job.status) &&
            !job.quotaRefundedAt &&
            job.done < job.total && (
              <Button busy={resume.isPending} onClick={() => resume.mutate()}>
                <RotateCcw size={16} />
                Lanjutkan file tersisa
              </Button>
            )}
          {["failed", "partial"].includes(job.status) &&
            !job.quotaRefundedAt && (
              <Modal
                title="Tutup proses gagal?"
                description="Kuota dikembalikan ke periode saat proses dibuat. Proses ini tidak dapat dilanjutkan lagi."
                trigger={
                  <Button variant="secondary">Tutup & kembalikan kuota</Button>
                }
              >
                <p>
                  Hasil yang sudah tersimpan tetap dapat ditinjau sampai masa
                  penyimpanannya berakhir. Jika periode asal sudah lewat,
                  pengembalian tidak menambah kuota minggu ini.
                </p>
                <Button busy={close.isPending} onClick={() => close.mutate()}>
                  Tutup proses gagal
                </Button>
              </Modal>
            )}
          {job.done > 0 && !active && job.status !== "cancelled" && (
            <Link
              className="button button-secondary"
              href={`/jobs/${id}/result`}
            >
              <Download size={16} />
              Tinjau & unduh hasil
            </Link>
          )}
        </div>
      </section>
      <div className="section-heading">
        <h2>Urutan dokumen</h2>
        <span className="muted">{job.llmRequestCount} request AI terkirim</span>
      </div>
      <ol className="job-file-list">
        {job.files.map((file, index) => (
          <li key={file.id} className={`job-file job-file-${file.status}`}>
            <span className="job-file-order">
              {file.status === "succeeded" ? (
                <Check size={16} />
              ) : file.status === "running" ? (
                <LoaderCircle size={17} className="spin" />
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            <FileText size={17} aria-hidden />
            <div>
              <strong>{file.path}</strong>
              {file.errorCode && (
                <span className="field-error">
                  {errorLabels[file.errorCode] ?? "File belum berhasil dibuat."}
                </span>
              )}
            </div>
            <span className={`status-label status-${file.status}`}>
              <i />
              {statusLabels[file.status]}
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
