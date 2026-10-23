"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft,
  Download,
  FileText,
  Copy,
  Check,
  Code2,
  Eye,
  ExternalLink,
} from "lucide-react";
import { api, message } from "@/components/api";
import { Button, Loading, Notice } from "@/components/ui";
import { useJob } from "@/features/jobs/job";
import { ResultTools } from "@/features/pro/result-tools";
import { formatDate } from "@/domain/billing";
const agentPrompt =
  "Baca AGENTS.md, lalu dokumen specs/ sesuai urutan pada specs/index.md. Ringkas pemahaman, asumsi, pertanyaan terbuka, serta blocker sebelum coding. Setelah saya setujui, kerjakan specs/implementation-plan.md per fase. Jangan menganggap implementasi atau pengujian proyek sudah selesai tanpa bukti nyata.";
export function ResultPage({ id }: { id: string }) {
  const query = useJob(id);
  const [selected, setSelected] = useState<string | null>(null);
  const [source, setSource] = useState(false);
  const [copy, setCopy] = useState("idle");
  const [downloadError, setDownloadError] = useState("");
  const job = query.data?.job;
  const selectedId =
    selected ?? job?.files.find((f) => f.status === "succeeded")?.id;
  const showingManifest = selectedId === "manifest";
  const fileQuery = useQuery({
    queryKey: ["file", id, selectedId],
    queryFn: () =>
      api<{ file: { content: string; path: string } }>(
        `/jobs/${id}/files/${selectedId}`,
      ),
    enabled: Boolean(selectedId) && !showingManifest,
  });
  async function getDownload(fileId?: string) {
    setDownloadError("");
    try {
      const response = await fetch(
        `/api/jobs/${id}/${fileId ? `files/${fileId}/download` : "download"}`,
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message ?? "Unduhan gagal.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const name = disposition.match(/filename="([^"]+)"/)?.[1] ?? "buatin.zip";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDownloadError(message(error));
    }
  }
  if (query.isPending) return <Loading />;
  if (query.isError)
    return <Notice tone="error">{message(query.error)}</Notice>;
  if (!job) return null;
  const blocking = job.lint.some((issue) => issue.blocksExport);
  const available = ["succeeded", "partial", "failed"].includes(job.status);
  function internalTarget(href: string | undefined) {
    if (!href || /^(?:[a-z]+:|\/\/)/i.test(href)) return;
    let decoded: string;
    try {
      decoded = decodeURIComponent(href.split("#")[0]);
    } catch {
      return;
    }
    const segments = (fileQuery.data?.file.path ?? "").split("/").slice(0, -1);
    for (const segment of decoded.split("/")) {
      if (segment === "..") segments.pop();
      else if (segment && segment !== ".") segments.push(segment);
    }
    return job?.files.find(
      (file) => file.path === segments.join("/") && file.status === "succeeded",
    );
  }
  return (
    <>
      <Link href={`/jobs/${id}`} className="back-link">
        <ArrowLeft size={15} />
        Lihat progres
      </Link>
      <div className="page-heading compact">
        <div>
          <span className="tiny-label">Paket spesifikasi</span>
          <h1>{job.project.name}</h1>
          <p>
            {job.done} dari {job.total} dokumen tersedia. Tinjau sebelum mulai
            membangun.
          </p>
        </div>
        <Button
          disabled={!available || blocking}
          onClick={() => void getDownload()}
        >
          <Download size={17} />
          Unduh ZIP
        </Button>
      </div>
      <p className="muted">
        Hasil tersedia sampai {formatDate(job.expiresAt)}.
      </p>
      <ResultTools job={job} selectedId={selectedId} />
      {job.mock && (
        <Notice tone="info">
          Mode pengujian aktif. Dokumen inti disusun dari template; layanan
          eksternal memakai fixture pengujian. Tinjau isi sebelum implementasi.
        </Notice>
      )}
      {!available && (
        <Notice>Hasil belum dapat diunduh untuk status proses ini.</Notice>
      )}
      {downloadError && <Notice tone="error">{downloadError}</Notice>}
      {job.done < job.total && (
        <Notice>
          Paket belum lengkap. {job.total - job.done} dokumen belum berhasil.{" "}
          <Link href={`/jobs/${id}`}>Lanjutkan proses</Link>.
        </Notice>
      )}
      <details className="quality-report" open={blocking}>
        <summary>
          Laporan kualitas <span>{job.lint.length} catatan</span>
        </summary>
        <ul>
          {job.lint.map((issue, index) => (
            <li key={index} className={issue.blocksExport ? "field-error" : ""}>
              <strong>{issue.fileId ? `${issue.fileId}: ` : ""}</strong>
              {issue.message}
              {issue.blocksExport && " Ekspor terkait diblokir."}
            </li>
          ))}
        </ul>
        {!job.lint.length && (
          <p>
            Tidak ada temuan lint otomatis. Tinjauan manusia tetap diperlukan.
          </p>
        )}
      </details>
      <details className="quality-report">
        <summary>Rencana, asumsi, dan model</summary>
        <ul>
          {job.plan.selected.map((file) => (
            <li key={file.id}>
              <strong>{file.path}</strong>: {file.reason}
            </li>
          ))}
        </ul>
        <h3>Asumsi</h3>
        <ul>
          {job.plan.assumptions.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        <h3>Pertanyaan terbuka</h3>
        <ul>
          {job.plan.missing_info.map((item, index) => (
            <li key={index}>{item.question}</li>
          ))}
        </ul>
        <p>
          Model dilaporkan:{" "}
          {[
            ...new Set(job.files.map((file) => file.modelUsed).filter(Boolean)),
          ].join(", ") || "Belum diketahui"}
          .
        </p>
      </details>
      <section className="document-workspace">
        <aside className="file-explorer">
          <div className="explorer-title">
            Dokumen <span>{job.done}</span>
          </div>
          {job.files.map((file) => (
            <button
              key={file.id}
              className={`explorer-file ${file.id === selectedId ? "explorer-active" : ""}`}
              onClick={() => setSelected(file.id)}
              disabled={file.status !== "succeeded"}
            >
              <FileText size={15} />
              <span>{file.path.replace("specs/", "")}</span>
              {file.status === "succeeded" && <Check size={12} />}
            </button>
          ))}
          <button
            className="explorer-manifest"
            onClick={() => setSelected("manifest")}
          >
            <Code2 size={15} />
            manifest.json<span>Otomatis</span>
          </button>
        </aside>
        <div className="document-panel">
          <div className="document-toolbar">
            <span>
              {showingManifest
                ? "specs/manifest.json"
                : (fileQuery.data?.file.path ?? "Pilih dokumen")}
            </span>
            <div className="segmented">
              <button
                className={!source ? "selected" : ""}
                onClick={() => setSource(false)}
                aria-pressed={!source}
              >
                <Eye size={14} />
                Preview
              </button>
              <button
                className={source ? "selected" : ""}
                onClick={() => setSource(true)}
                aria-pressed={source}
              >
                <Code2 size={14} />
                Source
              </button>
            </div>
            {selectedId && !showingManifest && (
              <button
                className="icon-button"
                aria-label="Unduh dokumen terpilih"
                disabled={!available}
                onClick={() => void getDownload(selectedId)}
              >
                <Download size={17} />
              </button>
            )}
          </div>
          {showingManifest ? (
            <pre className="markdown-source">
              {JSON.stringify(job.manifest, null, 2)}
            </pre>
          ) : !selectedId ? (
            <p className="muted">Belum ada dokumen yang tersedia.</p>
          ) : fileQuery.isPending ? (
            <Loading label="Memuat dokumen..." />
          ) : fileQuery.isError ? (
            <Notice tone="error">{message(fileQuery.error)}</Notice>
          ) : source ? (
            <pre className="markdown-source">
              {fileQuery.data?.file.content}
            </pre>
          ) : (
            <article className="markdown-document">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                components={{
                  img: () => (
                    <span className="muted">[Gambar remote tidak dimuat]</span>
                  ),
                  a: ({ href, children }) =>
                    /^https?:\/\//i.test(href ?? "") ? (
                      <a href={href} target="_blank" rel="noopener noreferrer">
                        {children}
                        <ExternalLink size={12} />
                      </a>
                    ) : internalTarget(href) ? (
                      <button
                        className="text-button"
                        onClick={() => setSelected(internalTarget(href)!.id)}
                      >
                        {children}
                      </button>
                    ) : (
                      <span title={href}>{children}</span>
                    ),
                }}
              >
                {fileQuery.data?.file.content ??
                  "Belum ada dokumen yang tersedia."}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </section>
      <section className="agent-prompt">
        <div>
          <span className="tiny-label">Langkah berikutnya</span>
          <h2>Berikan arah kepada coding agent.</h2>
          <p className="muted">
            Unduh paket, lalu gunakan prompt ini bersama dokumen yang sudah
            ditinjau.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            void navigator.clipboard
              .writeText(agentPrompt)
              .then(() => setCopy("success"))
              .catch(() => setCopy("failed"));
          }}
        >
          {copy === "success" ? <Check size={15} /> : <Copy size={15} />}{" "}
          {copy === "success" ? "Tersalin" : "Salin prompt"}
        </Button>
        <textarea
          aria-label="Prompt untuk coding agent"
          readOnly
          value={agentPrompt}
        />
        {copy === "failed" && (
          <p role="status" className="muted">
            Clipboard tidak tersedia. Pilih dan salin teks pada kotak prompt.
          </p>
        )}
      </section>
    </>
  );
}
