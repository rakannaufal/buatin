"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Plus,
  Search,
  ArrowUpRight,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { api, message, statusLabels } from "@/components/api";
import { Empty, Loading, Notice, Button } from "@/components/ui";
import type { ProjectSummary } from "@/components/api-types";
import { webTypes } from "@/domain/catalog";
import type { AccountEntitlement } from "@/features/billing/types";
import { formatDate } from "@/domain/billing";
import { BatchQueue } from "@/features/pro/batch";
export function Dashboard() {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: ["projects", page],
    queryFn: () =>
      api<{
        projects: ProjectSummary[];
        total: number;
        usage: number;
        limit: number;
        mock: boolean;
        workerReady: boolean;
        processingMode: "request" | "worker";
        entitlement: AccountEntitlement;
      }>(`/projects?page=${page}`),
    refetchInterval: (q) =>
      q.state.data?.projects.some((p) =>
        ["planning", "generating"].includes(p.status),
      )
        ? 3000
        : false,
  });
  const data = query.data;
  const projects =
    data?.projects.filter((p) =>
      p.name.toLowerCase().includes(filter.toLowerCase()),
    ) ?? [];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="tiny-label">Ruang kerja Anda</span>
          <h1>
            Rencana besar,
            <br />
            <em>mulai dari brief.</em>
          </h1>
          <p>Ubah ide website menjadi dokumen yang siap dikerjakan.</p>
        </div>
        <Link className="button button-primary" href="/projects/new">
          <Plus size={17} />
          Proyek baru
        </Link>
      </div>
      {query.isError && (
        <Notice tone="error">
          {message(query.error)}{" "}
          <button className="text-button" onClick={() => void query.refetch()}>
            Coba kembali
          </button>
        </Notice>
      )}
      <section className="overview-strip" aria-label="Ringkasan workspace">
        <div className="overview-primary">
          <span>Proyek tersimpan</span>
          <strong>{data?.total ?? "—"}</strong>
          <FileText size={29} strokeWidth={1.3} aria-hidden />
        </div>
        <div>
          <span>{data?.entitlement.name ?? "Paket"}</span>
          <strong>{data ? `${data.usage} / ${data.limit}` : "—"}</strong>
          <small>
            {data?.entitlement.resetsAt
              ? `Reset ${formatDate(data.entitlement.resetsAt)}`
              : "Satu kali per akun seumur hidup"}
          </small>
        </div>
        <div className="overview-service">
          <span>Status pemrosesan</span>
          <strong className="service-text">
            <i
              className={
                data?.workerReady ? "status-dot" : "status-dot status-warning"
              }
            />
            {data?.workerReady ? "Siap memproses" : "Belum terhubung"}
          </strong>
          <small>
            {data?.processingMode === "request"
              ? "Bertahap selama workspace terbuka"
              : "Worker latar belakang"}
          </small>
        </div>
      </section>
      {data && (
        <div className="quota-caption">
          <span>
            {data.entitlement.remaining} generasi tersisa. Penyimpanan hasil{" "}
            {data.entitlement.retentionDays} hari.
          </span>
          <Link className="text-button" href="/billing">
            Kelola paket
          </Link>
        </div>
      )}
      {data?.entitlement.features.batch && <BatchQueue />}
      <div className="section-heading">
        <div>
          <h2>
            Proyek Anda <span className="count-tag">{data?.total ?? 0}</span>
          </h2>
          <p className="muted">Lanjutkan draft atau tinjau paket dokumen.</p>
        </div>
        <label className="search-field">
          <Search size={17} />
          <span className="sr-only">Cari proyek pada halaman ini</span>
          <input
            placeholder="Cari di halaman ini..."
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          />
        </label>
      </div>
      {query.isPending ? (
        <Loading />
      ) : data?.total === 0 ? (
        <section className="first-project">
          <div>
            <span className="tiny-label">Dari ide ke dokumen</span>
            <h2>
              Proyek pertama Anda
              <br />
              dimulai di sini.
            </h2>
            <p>
              Tulis brief yang jelas. Pilih dokumen yang dibutuhkan. Berikan
              arah yang tepat kepada coding agent Anda.
            </p>
            <Link href="/projects/new" className="button button-primary">
              Susun brief pertama
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="first-project-guide">
            <div className="guide-step">
              <span>01</span>
              <div>
                <strong>Ceritakan idenya</strong>
                <p>Tujuan, pengguna, dan fitur utama.</p>
              </div>
            </div>
            <div className="guide-step">
              <span>02</span>
              <div>
                <strong>Periksa rencananya</strong>
                <p>Dokumen relevan beserta alasan dipilih.</p>
              </div>
            </div>
            <div className="guide-step">
              <span>
                <CheckCircle2 size={19} />
              </span>
              <div>
                <strong>Mulai dengan arah</strong>
                <p>Paket Markdown untuk coding agent.</p>
              </div>
            </div>
            <span className="guide-caption">
              Satu alur. Sampai siap ditinjau.
            </span>
          </div>
        </section>
      ) : projects.length === 0 ? (
        <Empty
          title="Tidak ada proyek yang cocok."
          description="Ubah kata pencarian untuk melihat proyek pada halaman ini."
        />
      ) : (
        <div className="table-scroll">
          <table className="projects-table">
            <thead>
              <tr>
                <th>Nama proyek</th>
                <th>Jenis website</th>
                <th>Status</th>
                <th>Diperbarui</th>
                <th>
                  <span className="sr-only">Buka</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link
                      className="project-name"
                      href={
                        project.jobs[0] &&
                        [
                          "generating",
                          "completed",
                          "completed_partial",
                          "failed",
                          "cancelled",
                        ].includes(project.status)
                          ? `/jobs/${project.jobs[0].id}`
                          : project.status === "plan_ready" ||
                              project.status === "planning" ||
                              project.status === "needs_clarification"
                            ? `/projects/${project.id}/plan`
                            : `/projects/${project.id}`
                      }
                    >
                      <span className="document-icon">
                        <FileText size={20} />
                      </span>
                      <span>
                        <strong>{project.name}</strong>
                        <small>
                          {project.briefPreview || "Brief belum diisi"}
                        </small>
                      </span>
                    </Link>
                  </td>
                  <td>
                    {webTypes.find((t) => t.id === project.webType)?.label}
                  </td>
                  <td>
                    <span className={`status-label status-${project.status}`}>
                      <i />
                      {statusLabels[project.status] ?? project.status}
                    </span>
                  </td>
                  <td className="muted date-cell">
                    {new Intl.DateTimeFormat("id-ID", {
                      dateStyle: "medium",
                    }).format(new Date(project.updatedAt))}
                  </td>
                  <td>
                    <Link
                      href={`/projects/${project.id}`}
                      className="icon-button"
                      aria-label={`Edit ${project.name}`}
                    >
                      <ArrowUpRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > 20 && (
        <div className="pagination">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Sebelumnya
          </Button>
          <span>Halaman {page}</span>
          <Button
            variant="secondary"
            disabled={page * 20 >= data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}
      <div className="workspace-tip">
        <span className="tip-mark">i</span>
        <p>
          <strong>
            Brief yang spesifik menghasilkan rencana yang lebih terarah.
          </strong>{" "}
          Sertakan batasan proyek dan hal yang tidak perlu dibangun.
        </p>
      </div>
    </>
  );
}
