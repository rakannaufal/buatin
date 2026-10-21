"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, post, message } from "@/components/api";
import { Button, Loading, Notice, Modal } from "@/components/ui";
import { catalog } from "@/domain/catalog";
import type { AccountEntitlement } from "@/features/billing/types";
export interface Preset {
  id: string;
  name: string;
  brief: string;
  webType: string;
  preferences?: import("@/domain/preferences").ProjectPreferences;
}
export function useEntitlement() {
  return useQuery({
    queryKey: ["account"],
    queryFn: () =>
      api<{
        entitlement: AccountEntitlement;
        user: { name: string; email: string };
      }>("/account"),
    staleTime: 15000,
  });
}
export function LibraryPage() {
  const account = useEntitlement();
  if (account.isPending) return <Loading />;
  if (account.isError)
    return <Notice tone="error">{message(account.error)}</Notice>;
  const entitlement = account.data.entitlement;
  return (
    <>
      <div className="page-heading compact">
        <div>
          <h1>Pustaka pribadi.</h1>
          <p>
            Brief yang bisa dipakai ulang. Kerangka dokumen sesuai cara kerja
            Anda.
          </p>
        </div>
      </div>
      {entitlement.features.presets ? (
        <PresetLibrary />
      ) : (
        <section className="feature-upgrade">
          <h2>Simpan pola proyek Anda.</h2>
          <p>
            Pro Plus dan Max menyimpan hingga 50 preset brief untuk memulai
            proyek berikutnya.
          </p>
          <Link className="button button-secondary" href="/billing">
            Lihat paket
          </Link>
        </section>
      )}
      {entitlement.features.templates ? (
        <TemplateLibrary />
      ) : (
        <section className="feature-upgrade">
          <h2>Template dokumen pribadi</h2>
          <p>
            Pro Max memakai template Markdown Anda saat membuat proses baru.
            Setiap proses menyimpan salinan template agar resume tetap
            konsisten.
          </p>
          <Link className="text-button" href="/billing">
            Lihat Pro Max
          </Link>
        </section>
      )}
    </>
  );
}
function PresetLibrary() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["presets"],
    queryFn: () => api<{ presets: Preset[] }>("/presets"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/presets/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["presets"] }),
  });
  return (
    <section className="library-section">
      <h2>Preset brief</h2>
      <p className="muted">
        Simpan preset dari editor proyek. Gunakan kembali saat membuat proyek
        baru.
      </p>
      {query.isPending ? (
        <Loading />
      ) : query.isError ? (
        <Notice tone="error">{message(query.error)}</Notice>
      ) : !query.data.presets.length ? (
        <p>
          Belum ada preset.{" "}
          <Link className="text-button" href="/projects/new">
            Tulis brief pertama
          </Link>
          .
        </p>
      ) : (
        <ul className="library-list">
          {query.data.presets.map((preset) => (
            <li key={preset.id}>
              <div>
                <strong>{preset.name}</strong>
                <p>{preset.brief.slice(0, 160)}</p>
              </div>
              <Link
                className="button button-secondary"
                href={`/projects/new?preset=${preset.id}`}
              >
                Gunakan preset
              </Link>
              <Modal
                title="Hapus preset?"
                description={preset.name}
                trigger={<Button variant="ghost">Hapus</Button>}
              >
                <Button
                  variant="danger"
                  busy={remove.isPending}
                  onClick={() => remove.mutate(preset.id)}
                >
                  Hapus preset
                </Button>
              </Modal>
            </li>
          ))}
        </ul>
      )}
      {remove.error && <Notice tone="error">{message(remove.error)}</Notice>}
    </section>
  );
}
function TemplateLibrary() {
  const query = useQuery({
    queryKey: ["templates"],
    queryFn: () =>
      api<{ templates: { fileId: string; content: string }[] }>("/templates"),
  });
  const [selected, setSelected] = useState("prd");
  if (query.isPending) return <Loading />;
  if (query.isError)
    return <Notice tone="error">{message(query.error)}</Notice>;
  return (
    <section className="library-section">
      <h2>Template Markdown</h2>
      <p className="muted">
        Hanya akun Anda yang memakai template ini. Dokumen tanpa override
        mengikuti kerangka bawaan. Maksimal 32.000 karakter per template.
      </p>
      <label htmlFor="template-document">Dokumen</label>
      <select
        id="template-document"
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
      >
        {catalog.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.path}
            {query.data.templates.some(
              (template) => template.fileId === entry.id,
            )
              ? " (pribadi)"
              : ""}
          </option>
        ))}
      </select>
      <TemplateEditor
        key={`${selected}:${query.dataUpdatedAt}`}
        fileId={selected}
        initial={
          query.data.templates.find((template) => template.fileId === selected)
            ?.content ?? ""
        }
      />
    </section>
  );
}
function TemplateEditor({
  fileId,
  initial,
}: {
  fileId: string;
  initial: string;
}) {
  const [content, setContent] = useState(initial);
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (reset: boolean) =>
      api(`/templates/${fileId}`, {
        method: reset ? "DELETE" : "PUT",
        body: reset ? undefined : JSON.stringify({ content }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["templates"] }),
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(false);
      }}
    >
      <div className="field">
        <label htmlFor="template-content">Isi template</label>
        <textarea
          id="template-content"
          rows={16}
          maxLength={32000}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="# Judul dokumen&#10;&#10;## Tujuan&#10;[Isi sesuai brief]"
          required
          minLength={10}
          spellCheck={false}
          className="code-editor"
        />
      </div>
      {save.error && <Notice tone="error">{message(save.error)}</Notice>}
      {save.isSuccess && <p role="status">Template tersimpan.</p>}
      <div className="inline-actions">
        <Button type="submit" busy={save.isPending}>
          Simpan template
        </Button>
        <Button
          variant="secondary"
          disabled={!initial || save.isPending}
          onClick={() => save.mutate(true)}
        >
          Gunakan kerangka bawaan
        </Button>
      </div>
    </form>
  );
}
export function PresetControls({
  values,
  apply,
}: {
  values: () => {
    name: string;
    brief: string;
    webType: string;
    preferences?: import("@/domain/preferences").ProjectPreferences;
  };
  apply: (preset: Preset) => void;
}) {
  const account = useEntitlement();
  const enabled = account.data?.entitlement.features.presets;
  const presets = useQuery({
    queryKey: ["presets"],
    queryFn: () => api<{ presets: Preset[] }>("/presets"),
    enabled: Boolean(enabled),
  });
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: () => post("/presets", values()),
    onSuccess: () => client.invalidateQueries({ queryKey: ["presets"] }),
  });
  if (!enabled) return null;
  return (
    <section className="preset-controls">
      <label htmlFor="use-preset">Mulai dari preset pribadi</label>
      <div className="inline-actions">
        <select
          id="use-preset"
          defaultValue=""
          onChange={(event) => {
            const preset = presets.data?.presets.find(
              (item) => item.id === event.target.value,
            );
            if (preset) apply(preset);
          }}
        >
          <option value="">Pilih preset</option>
          {presets.data?.presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          busy={save.isPending}
          onClick={() => save.mutate()}
        >
          Simpan sebagai preset
        </Button>
      </div>
      {save.error && <Notice tone="error">{message(save.error)}</Notice>}
      {save.isSuccess && (
        <p role="status">Preset tersimpan di pustaka pribadi.</p>
      )}
    </section>
  );
}
