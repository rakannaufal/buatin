"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, post, message } from "@/components/api";
import { Button, Loading, Notice } from "@/components/ui";
import { useEntitlement } from "./library";
import type { JobView } from "@/components/api-types";
import { formatDate } from "@/domain/billing";
export function ResultTools({
  job,
  selectedId,
}: {
  job: JobView;
  selectedId: string | undefined;
}) {
  const account = useEntitlement();
  if (!account.data?.entitlement.features.regeneration) return null;
  return <AdvancedResults job={job} fileId={selectedId ?? "prd"} />;
}
function AdvancedResults({ job, fileId }: { job: JobView; fileId: string }) {
  const router = useRouter();
  const [files, setFiles] = useState<string[]>([]);
  const [withId, setWithId] = useState("");
  const [key, setKey] = useState(() => crypto.randomUUID());
  const canRegenerate =
    ["succeeded", "partial"].includes(job.status) && !job.quotaRefundedAt;
  const impacted = useQuery({
    queryKey: ["regenerate-preview", job.id, files],
    queryFn: () =>
      api<{ impacted: string[] }>(`/jobs/${job.id}/regenerate`, {
        method: "PUT",
        body: JSON.stringify({ fileIds: files }),
      }),
    enabled: files.length > 0 && canRegenerate,
  });
  const regenerate = useMutation({
    mutationFn: () =>
      post<{ job: { id: string } }>(
        `/jobs/${job.id}/regenerate`,
        { fileIds: files },
        { "Idempotency-Key": key },
      ),
    onSuccess: ({ job }) => router.push(`/jobs/${job.id}`),
  });
  const history = useQuery({
    queryKey: ["history", job.project.id],
    queryFn: () =>
      api<{ jobs: { id: string; status: string; createdAt: string }[] }>(
        `/projects/${job.project.id}/history`,
      ),
  });
  const comparison = useQuery({
    queryKey: ["compare", job.id, withId, fileId],
    queryFn: () =>
      api<{ left: { content: string }; right: { content: string } }>(
        `/jobs/${job.id}/compare?with=${encodeURIComponent(withId)}&file=${encodeURIComponent(fileId)}`,
      ),
    enabled: Boolean(withId) && fileId !== "manifest",
  });
  return (
    <details className="quality-report">
      <summary>Fitur Pro: regenerasi & perbandingan</summary>
      <h3>Buat ulang dokumen pilihan</h3>
      <p className="muted">
        Memakai satu kuota baru. Dokumen yang bergantung pada pilihan ikut
        dibuat ulang; file lain disalin dari hasil ini. Brief, preferensi,
        referensi, skill dan template mengikuti versi hasil asal. Susun rencana
        baru untuk memakai perubahan brief terbaru.
      </p>
      {!canRegenerate && (
        <Notice>
          Regenerasi tersedia setelah proses selesai. Proses yang sudah ditutup
          tidak dapat diregenerasi.
        </Notice>
      )}
      <div className="regeneration-files">
        {job.files.map((file) => (
          <label className="check-row" key={file.id}>
            <input
              type="checkbox"
              checked={files.includes(file.id)}
              disabled={regenerate.isPending || !canRegenerate}
              onChange={(event) => {
                setFiles((current) =>
                  event.target.checked
                    ? [...current, file.id]
                    : current.filter((id) => id !== file.id),
                );
                setKey(crypto.randomUUID());
              }}
            />
            <span>{file.path}</span>
          </label>
        ))}
      </div>
      {files.length > 0 &&
        (impacted.isPending ? (
          <Loading />
        ) : impacted.isError ? (
          <Notice tone="error">{message(impacted.error)}</Notice>
        ) : (
          <p>
            Dokumen yang akan dibuat ulang: {impacted.data.impacted.join(", ")}.
            Total {impacted.data.impacted.length} dokumen.
          </p>
        ))}
      {regenerate.error && (
        <Notice tone="error">{message(regenerate.error)}</Notice>
      )}
      <Button
        disabled={!files.length || !impacted.data || !canRegenerate}
        busy={regenerate.isPending}
        onClick={() => regenerate.mutate()}
      >
        Konfirmasi regenerasi, gunakan 1 kuota
      </Button>
      <hr />
      <h3>Bandingkan hasil</h3>
      <label htmlFor="compare-result">Versi sebelumnya</label>
      <select
        id="compare-result"
        value={withId}
        onChange={(event) => setWithId(event.target.value)}
      >
        <option value="">Pilih hasil proyek yang sama</option>
        {history.data?.jobs
          .filter((item) => item.id !== job.id)
          .map((item) => (
            <option key={item.id} value={item.id}>
              {formatDate(item.createdAt)} ({item.status})
            </option>
          ))}
      </select>
      {history.isError && (
        <Notice tone="error">{message(history.error)}</Notice>
      )}
      {withId && fileId === "manifest" && (
        <p>Pilih dokumen Markdown untuk membandingkan.</p>
      )}
      {withId && comparison.isPending && fileId !== "manifest" && <Loading />}
      {comparison.error && (
        <Notice tone="error">{message(comparison.error)}</Notice>
      )}
      {withId && comparison.data && fileId !== "manifest" && (
        <div className="comparison-columns">
          <section>
            <h3>Hasil sebelumnya</h3>
            <pre>
              {comparison.data.left.content || "Dokumen belum tersedia."}
            </pre>
          </section>
          <section>
            <h3>Hasil ini</h3>
            <pre>
              {comparison.data.right.content || "Dokumen belum tersedia."}
            </pre>
          </section>
        </div>
      )}
    </details>
  );
}
