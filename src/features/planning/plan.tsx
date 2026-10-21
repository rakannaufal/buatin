"use client";
import "@/features/projects/customization.css";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  FileText,
  Check,
  SlidersHorizontal,
  Clock,
  RefreshCw,
} from "lucide-react";
import { api, post, patch, message, errorLabels } from "@/components/api";
import { Button, Loading, Notice, Modal } from "@/components/ui";
import type { ProjectDetail } from "@/components/api-types";
import { catalog } from "@/domain/catalog";
import { technologyCatalog } from "@/domain/technology";
import { DesignPreview } from "@/features/projects/design-fields";
import type { WebType } from "@/domain/types";
export function PlanPage({ id }: { id: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const [answers, setAnswers] = useState<string[]>([]);
  const [startKey] = useState(() => crypto.randomUUID());
  const query = useQuery({
    queryKey: ["project", id],
    queryFn: () => api<{ project: ProjectDetail }>(`/projects/${id}`),
    refetchOnMount: "always",
    refetchInterval: (q) =>
      q.state.data?.project.status === "planning" ? 1500 : false,
  });
  const project = query.data?.project;
  const current = project?.plans[0];
  const plan = current?.data;
  const toggle = useMutation({
    mutationFn: ({ fileId, include }: { fileId: string; include: boolean }) =>
      patch(`/projects/${id}/plan`, {
        fileId,
        include,
        version: current!.version,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["project", id] }),
  });
  const start = useMutation({
    mutationFn: () =>
      post<{ job: { id: string } }>(
        `/projects/${id}/jobs`,
        { planVersion: current!.version },
        { "Idempotency-Key": startKey },
      ),
    onSuccess: (result) => router.push(`/jobs/${result.job.id}`),
  });
  const clarify = useMutation({
    mutationFn: async () => {
      const result = await post<{ project: ProjectDetail }>(
        `/projects/${id}/clarification`,
        { briefVersion: project!.briefVersion, answers },
      );
      await post(`/projects/${id}/plans`, {
        briefVersion: result.project.briefVersion,
      });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["project", id] }),
  });
  const retry = useMutation({
    mutationFn: () =>
      post(`/projects/${id}/plans`, { briefVersion: project!.briefVersion }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["project", id] }),
  });
  if (query.isPending) return <Loading />;
  if (query.isError)
    return <Notice tone="error">{message(query.error)}</Notice>;
  return (
    <>
      <Link className="back-link" href={`/projects/${id}`}>
        <ArrowLeft size={15} />
        Kembali ke brief
      </Link>
      <div className="page-heading compact">
        <div>
          <span className="tiny-label">Periksa sebelum dibuat</span>
          <h1>Rencana dokumen.</h1>
          <p>{project?.name}</p>
        </div>
        <span className="step-marker">
          Brief <Check size={13} /> Rencana <span /> Hasil
        </span>
      </div>
      {[toggle.error, start.error, clarify.error, retry.error]
        .filter(Boolean)
        .map((error, index) => (
          <Notice key={index} tone="error">
            {message(error)}
          </Notice>
        ))}
      {project?.status === "planning" ? (
        <section className="panel planning-pending">
          <Loading label="Membaca brief dan menyusun pilihan dokumen..." />
          <p className="muted">
            Halaman boleh ditutup. Rencana akan tersimpan di workspace.
          </p>
        </section>
      ) : project?.tasks[0]?.status === "failed" ? (
        <Notice tone="error">
          {errorLabels[project.tasks[0].errorCode ?? ""] ??
            "Rencana belum berhasil disusun."}{" "}
          <Button
            variant="secondary"
            busy={retry.isPending}
            onClick={() => retry.mutate()}
          >
            <RefreshCw size={15} />
            Coba lagi
          </Button>
        </Notice>
      ) : !plan ? (
        <Notice tone="info">
          Rencana belum tersedia.{" "}
          <Link href={`/projects/${id}`}>Lengkapi brief</Link> untuk memulai.
        </Notice>
      ) : project?.status === "needs_clarification" ? (
        <section className="panel clarification">
          <h2>Beberapa hal perlu diperjelas.</h2>
          <p className="muted">
            Jawab yang sudah Anda ketahui. Pertanyaan yang dilewati dicatat
            sebagai asumsi; hanya satu putaran.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              clarify.mutate();
            }}
          >
            {plan.missing_info.slice(0, 5).map((question, index) => (
              <div className="field" key={question.question}>
                <label htmlFor={`answer-${index}`}>
                  {index + 1}. {question.question}
                </label>
                <textarea
                  id={`answer-${index}`}
                  rows={2}
                  maxLength={1000}
                  value={answers[index] ?? ""}
                  onChange={(event) =>
                    setAnswers((current) => {
                      const updated = [...current];
                      updated[index] = event.target.value;
                      return updated;
                    })
                  }
                />
              </div>
            ))}
            <Button type="submit" busy={clarify.isPending}>
              Lanjutkan dengan jawaban ini
              <ArrowRight size={16} />
            </Button>
          </form>
        </section>
      ) : (
        <>
          {plan.fallback && (
            <Notice>
              Pemilihan otomatis memakai dokumen minimum dan wajib tipe karena
              hasil planner belum valid.
            </Notice>
          )}
          {plan.selected.length > 25 && (
            <Notice>
              Paket mencakup lebih dari 25 dokumen. Generasi dapat lebih lama
              dan memakai lebih banyak token.
            </Notice>
          )}
          <div className="plan-layout">
            <section>
              {project?.customization && (
                <details className="plan-customization">
                  <summary>
                    Tinjau teknologi, desain, skill dan referensi
                  </summary>
                  <dl className="recommendation-list">
                    {Object.entries(
                      project.customization.preferences.technology,
                    ).map(([key, value]) => (
                      <div key={key}>
                        <dt>
                          {technologyCatalog.find((entry) => entry.id === key)
                            ?.label ?? key}
                        </dt>
                        <dd>{value === "none" ? "Tidak diperlukan" : value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p>
                    Skill aktif:{" "}
                    {project.customization.skills
                      .map((skill) => skill.name)
                      .join(", ")}
                    .
                  </p>
                  <p>
                    {project.customization.references.length} referensi siap
                    digunakan.
                  </p>
                  <DesignPreview
                    value={project.preferences}
                    webType={project.webType as WebType}
                  />
                </details>
              )}
              <div className="plan-summary">
                <FileText size={23} strokeWidth={1.4} />
                <div>
                  <h2>{plan.project_name}</h2>
                  <p>{plan.summary}</p>
                </div>
              </div>
              <div className="section-heading">
                <h2>
                  Dokumen terpilih{" "}
                  <span className="count-tag">{plan.selected.length}</span>
                </h2>
                <span className="muted">
                  <SlidersHorizontal size={14} /> Sesuaikan pilihan
                </span>
              </div>
              <div className="file-checklist">
                {catalog.map((file) => {
                  const selected = plan.selected.find((f) => f.id === file.id);
                  const dependent = plan.selected.find(
                    (f) =>
                      f.id !== file.id &&
                      catalog
                        .find((c) => c.id === f.id)
                        ?.requires.includes(file.id),
                  );
                  const locked = selected?.locked || Boolean(dependent);
                  return (
                    <label
                      key={file.id}
                      className={`file-choice ${selected ? "file-selected" : ""} ${locked ? "file-locked" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(selected)}
                        disabled={
                          locked ||
                          toggle.isPending ||
                          project?.status !== "plan_ready"
                        }
                        onChange={(event) =>
                          toggle.mutate({
                            fileId: file.id,
                            include: event.target.checked,
                          })
                        }
                        aria-label={`Pilih ${file.path}`}
                      />
                      <div>
                        <strong>{file.path}</strong>
                        <span>{selected?.reason ?? file.purpose}</span>
                      </div>
                      {locked ? (
                        <span
                          className="file-lock"
                          title={
                            dependent
                              ? `Dibutuhkan ${dependent.path}`
                              : "Dokumen wajib"
                          }
                        >
                          <LockKeyhole size={13} />
                          <span>Wajib</span>
                        </span>
                      ) : (
                        <small>
                          {file.kind === "optional" ? "Opsional" : "Inti"}
                        </small>
                      )}
                    </label>
                  );
                })}
              </div>
              <div className="manifest-note">
                <Check size={17} />
                <span>
                  <strong>specs/manifest.json</strong> ditambahkan otomatis.
                  Tidak memakai panggilan AI.
                </span>
              </div>
            </section>
            <aside className="plan-aside">
              <div className="panel">
                <span className="tiny-label">Ringkasan paket</span>
                <strong className="package-number">
                  {plan.selected.length + 1}
                  <span>file</span>
                </strong>
                <p>{plan.selected.length} Markdown + 1 manifest</p>
                <hr />
                <div className="estimate">
                  <Clock size={17} />
                  <span>
                    Estimasi awal 10–30 menit.
                    <small>Bergantung model dan jumlah dokumen.</small>
                  </span>
                </div>
                <p className="muted">
                  Pilihan wajib terkunci untuk menjaga kelengkapan dan
                  dependensi paket.
                </p>
                <Modal
                  title="Mulai membuat dokumen?"
                  description={`${plan.selected.length} dokumen Markdown akan diproses berdasarkan versi brief yang disetujui.`}
                  trigger={
                    <Button
                      className="full-width"
                      disabled={project?.status !== "plan_ready"}
                    >
                      Mulai generasi
                      <ArrowRight size={16} />
                    </Button>
                  }
                >
                  <p>
                    Proses berjalan di server meski tab ditutup. Setiap proses
                    baru memakai satu kuota paket. Hasil yang gagal sebagian
                    dapat dilanjutkan.
                  </p>
                  <p className="muted">
                    Saat mode AI nyata aktif, brief diteruskan melalui 9router
                    ke provider. Periksa kembali agar tidak memuat data rahasia.
                  </p>
                  {start.error && (
                    <Notice tone="error">{message(start.error)}</Notice>
                  )}
                  <Button
                    busy={start.isPending}
                    onClick={() => start.mutate()}
                    className="full-width"
                  >
                    Konfirmasi dan mulai
                    <ArrowRight size={16} />
                  </Button>
                </Modal>
              </div>
              <div className="assumptions">
                <h3>Asumsi & catatan</h3>
                <ul>
                  {plan.assumptions.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                  {plan.risks.map((item, index) => (
                    <li key={`risk-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
