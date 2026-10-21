"use client";
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  RefreshCw,
  Check,
  Server,
  KeyRound,
  Database,
} from "lucide-react";
import { api, post, message } from "@/components/api";
import { Button, Loading, Notice } from "@/components/ui";
import { AdminUnlock } from "@/features/admin/shared";
import "@/features/admin/admin.css";
type Settings = {
  mock: boolean;
  version: number;
  planner: string;
  writer: string;
  workerReady: boolean;
  workerAt: string | null;
  limits: { brief: number; documents: number; concurrency: number };
};
export function SettingsPage() {
  const client = useQueryClient();
  const [planner, setPlanner] = useState<string | null>(null),
    [writer, setWriter] = useState<string | null>(null),
    [reason, setReason] = useState("");
  const receipt = useRef<{ payload: string; key: string } | null>(null);
  const query = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<Settings>("/settings"),
  });
  const check = useMutation({
    mutationFn: () =>
      post<{ models: string[]; mock: boolean }>("/settings/llm-check"),
  });
  const save = useMutation({
    mutationFn: () => {
      const payload = JSON.stringify({
        planner: planner ?? query.data?.planner,
        writer: writer ?? query.data?.writer,
        version: query.data?.version,
        reason,
      });
      if (!receipt.current || receipt.current.payload !== payload)
        receipt.current = { payload, key: crypto.randomUUID() };
      return api("/settings", {
        method: "PATCH",
        headers: { "Idempotency-Key": receipt.current.key },
        body: payload,
      });
    },
    onSuccess: async () => {
      receipt.current = null;
      setReason("");
      await client.invalidateQueries({ queryKey: ["settings"] });
    },
  });
  if (query.isPending) return <Loading />;
  if (query.isError)
    return <Notice tone="error">{message(query.error)}</Notice>;
  const data = query.data;
  return (
    <>
      <div className="page-heading compact">
        <div>
          <span className="tiny-label">Konfigurasi workspace</span>
          <h1>Siap bekerja dengan tenang.</h1>
          <p>Koneksi, pilihan model, dan batas penggunaan aplikasi.</p>
        </div>
        <ShieldCheck size={32} strokeWidth={1.3} />
      </div>
      <AdminUnlock />
      {data.mock && (
        <Notice tone="info">
          Mode mock aktif. Ubah <code>MOCK_LLM=false</code> pada environment
          server setelah key dan model nyata siap.
        </Notice>
      )}
      <div className="settings-layout">
        <section className="settings-section">
          <div className="settings-heading">
            <Server size={21} />
            <div>
              <h2>Layanan AI</h2>
              <p>Semua request melalui adapter 9router pada server.</p>
            </div>
          </div>
          <div className="settings-status">
            <span>
              <i
                className={
                  data.workerReady ? "status-dot" : "status-dot status-warning"
                }
              />
              Worker {data.workerReady ? "terhubung" : "belum terhubung"}
            </span>
            <Button
              variant="secondary"
              busy={check.isPending}
              onClick={() => check.mutate()}
            >
              <RefreshCw size={15} />
              Periksa koneksi AI
            </Button>
          </div>
          {check.error && <Notice tone="error">{message(check.error)}</Notice>}
          {check.data && (
            <Notice tone="info">
              <Check size={14} />
              Koneksi berhasil. {check.data.models.length} model/combo tersedia.
              Pemeriksaan ini tidak memastikan kuota upstream.
            </Notice>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save.mutate();
            }}
          >
            <div className="field">
              <label htmlFor="planner-model">Model planner</label>
              {check.data ? (
                <select
                  id="planner-model"
                  value={planner ?? data.planner}
                  disabled={data.mock}
                  onChange={(event) => setPlanner(event.target.value)}
                >
                  {check.data.models.map((model) => (
                    <option key={model}>{model}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="planner-model"
                  value={planner ?? data.planner}
                  disabled={data.mock}
                  onChange={(event) => setPlanner(event.target.value)}
                  placeholder="ID model dari 9router"
                />
              )}
            </div>
            <div className="field">
              <label htmlFor="writer-model">Model writer</label>
              {check.data ? (
                <select
                  id="writer-model"
                  value={writer ?? data.writer}
                  disabled={data.mock}
                  onChange={(event) => setWriter(event.target.value)}
                >
                  {check.data.models.map((model) => (
                    <option key={model}>{model}</option>
                  ))}
                </select>
              ) : (
                <input
                  id="writer-model"
                  value={writer ?? data.writer}
                  disabled={data.mock}
                  onChange={(event) => setWriter(event.target.value)}
                  placeholder="ID model dari 9router"
                />
              )}
            </div>
            <label className="field">
              <span>Alasan perubahan model</span>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={8}
                maxLength={500}
                required
                disabled={data.mock}
              />
              <small className="muted">
                Minimal 8 karakter. Jangan tulis kredensial atau data rahasia.
              </small>
            </label>
            {save.error && <Notice tone="error">{message(save.error)}</Notice>}
            {save.isSuccess && (
              <Notice tone="info">
                Pilihan tersimpan untuk job baru. Job sebelumnya tetap memakai
                snapshot sendiri.
              </Notice>
            )}
            <Button type="submit" disabled={data.mock} busy={save.isPending}>
              Simpan pilihan model
            </Button>
          </form>
        </section>
        <aside>
          <section className="settings-section">
            <div className="settings-heading">
              <Database size={21} />
              <div>
                <h2>Batas workspace</h2>
                <p>Diatur melalui environment server.</p>
              </div>
            </div>
            <dl className="limits-list">
              <div>
                <dt>Brief</dt>
                <dd>{data.limits.brief.toLocaleString("id-ID")} karakter</dd>
              </div>
              <div>
                <dt>Dokumen per job</dt>
                <dd>{data.limits.documents} Markdown + manifest</dd>
              </div>
              <div>
                <dt>Generasi bersamaan</dt>
                <dd>{data.limits.concurrency} akun</dd>
              </div>
              <div>
                <dt>Retensi konten</dt>
                <dd>Menurut versi paket saat job diterima</dd>
              </div>
              <div>
                <dt>Kuota dan antrean</dt>
                <dd>Menurut paket; kelola melalui Admin</dd>
              </div>
            </dl>
          </section>
          <section className="secret-note">
            <KeyRound size={19} />
            <h3>Key tetap di server.</h3>
            <p>
              API key 9router, URL layanan, dan secret autentikasi diatur
              operator melalui environment. Nilainya tidak dikirim ke browser.
            </p>
            <p>
              Database dan worker berjalan langsung pada host menggunakan
              Node.js dan PostgreSQL.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
