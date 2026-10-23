"use client";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Trash2, RefreshCw } from "lucide-react";
import { api, message } from "@/components/api";
import type { ReferenceView } from "@/components/api-types";
import { Button, Notice } from "@/components/ui";
import { PreferenceSection } from "./preference-controls";

interface Configuration {
  limits: { files: number; image: number; document: number; total: number };
  uploadAvailable: boolean;
  visionAvailable: boolean;
  binaryScanAvailable: boolean;
}
const errors: Record<string, string> = {
  REFERENCE_SCAN_FAILED:
    "Pemeriksaan keamanan gagal. Coba lagi atau gunakan file lain.",
  REFERENCE_SCANNER_REQUIRED:
    "Pemeriksaan dokumen belum tersedia. Gunakan teks atau gambar dahulu.",
  REFERENCE_PARSE_TIMEOUT:
    "Pemrosesan melewati batas waktu. Gunakan file lebih kecil.",
  REFERENCE_INTERRUPTED: "Pemrosesan terhenti. Coba lagi.",
  OCR_REQUIRED:
    "PDF ini memerlukan OCR. Tambahkan isi kebutuhan pada catatan atau gunakan PDF berteks.",
  PDF_PAGE_LIMIT: "PDF maksimal 100 halaman.",
  UNSAFE_DOCX:
    "Dokumen ditolak karena isi atau ukuran dekompresinya tidak aman.",
  INVALID_TEXT: "Gunakan teks UTF-8 yang dapat dibaca.",
  EMPTY_DOCUMENT: "Dokumen tidak memuat teks yang dapat dibaca.",
};
export interface PreparedReference {
  id: string;
  briefVersion: number;
}
export function ReferenceFields({
  projectId,
  prepare,
  onVersion,
  onBusy,
  onDirty,
  disabled = false,
}: {
  projectId: string | null;
  prepare: () => Promise<PreparedReference>;
  onVersion: (version: number) => void;
  onBusy: (busy: boolean) => void;
  onDirty: (dirty: boolean) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dragging, setDragging] = useState(false),
    [progress, setProgress] = useState("");
  const client = useQueryClient();
  const lock = useRef(false),
    dirtyIds = useRef(new Set<string>());
  const markDirty = useCallback(
    (id: string, dirty: boolean) => {
      if (dirty) dirtyIds.current.add(id);
      else dirtyIds.current.delete(id);
      onDirty(dirtyIds.current.size > 0);
    },
    [onDirty],
  );
  const config = useQuery({
    queryKey: ["customization"],
    queryFn: () => api<Configuration>("/customization"),
    staleTime: 60000,
  });
  const query = useQuery({
    queryKey: ["references", projectId],
    queryFn: () =>
      api<{ attachments: ReferenceView[]; briefVersion: number }>(
        `/projects/${projectId}/attachments`,
      ),
    enabled: Boolean(projectId),
    refetchInterval: (state) =>
      state.state.data?.attachments.some((file) =>
        ["queued", "processing"].includes(file.status),
      )
        ? 1000
        : false,
  });
  const files = query.data?.attachments ?? [];
  async function operation(
    action: (project: PreparedReference) => Promise<{ briefVersion: number }>,
  ) {
    if (lock.current) throw new Error("Tunggu perubahan referensi selesai.");
    lock.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      const project = await prepare();
      const result = await action(project);
      onVersion(result.briefVersion);
      await client.invalidateQueries({ queryKey: ["references"] });
      await client.invalidateQueries({ queryKey: ["project", project.id] });
    } catch (error) {
      setError(message(error));
      throw error;
    } finally {
      await client.invalidateQueries({ queryKey: ["references"] });
      lock.current = false;
      setBusy(false);
      onBusy(false);
      setProgress("");
    }
  }
  async function upload(selected: FileList | File[] | null) {
    if (
      !selected?.length ||
      lock.current ||
      disabled ||
      config.isPending ||
      config.isError ||
      !config.data?.uploadAvailable
    )
      return;
    const batch = Array.from(selected);
    try {
      await operation(async (project) => {
        let briefVersion = project.briefVersion;
        for (const [index, file] of batch.entries()) {
          if (
            config.data &&
            file.size >
              (/\.(png|jpe?g|webp)$/i.test(file.name)
                ? config.data.limits.image
                : config.data.limits.document)
          )
            throw new Error(`File ${file.name} melebihi batas ukuran.`);
          setProgress(`Mengunggah ${index + 1}/${batch.length}: ${file.name}`);
          const result = await api<{ briefVersion: number }>(
            `/projects/${project.id}/attachments`,
            {
              method: "POST",
              body: file,
              headers: {
                "Content-Type": "application/octet-stream",
                "X-File-Name": encodeURIComponent(file.name),
                "X-Brief-Version": String(briefVersion),
              },
            },
          );
          briefVersion = result.briefVersion;
          onVersion(briefVersion);
        }
        return { briefVersion };
      });
    } catch (error) {
      setError(message(error));
    }
  }
  return (
    <PreferenceSection
      title="Referensi gambar dan file"
      description="Lampirkan contoh visual, logo, isi konten, atau dokumen kebutuhan. Tambahkan catatan bagian yang ingin diikuti."
      summary={
        files.length
          ? `${files.length} referensi · ${files.filter((file) => file.status === "ready").length} siap`
          : "Opsional · gambar, PDF, DOCX, TXT, MD"
      }
      open
    >
      <div
        className={`reference-drop ${dragging ? "reference-dragging" : ""}`}
        aria-disabled={disabled || busy || !config.data?.uploadAvailable}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !busy && config.data?.uploadAvailable)
            setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          void upload(event.dataTransfer.files);
        }}
      >
        <Upload size={23} aria-hidden />
        <strong>Tarik referensi ke sini</strong>
        <p>
          Gambar maksimal{" "}
          {Math.floor((config.data?.limits.image ?? 5242880) / 1048576)} MiB,
          dokumen{" "}
          {Math.floor((config.data?.limits.document ?? 10485760) / 1048576)}{" "}
          MiB. Maksimal {config.data?.limits.files ?? 10} file, total{" "}
          {Math.floor((config.data?.limits.total ?? 26214400) / 1048576)} MiB.
        </p>
        <label
          className={`button button-secondary reference-pick ${busy ? "reference-disabled" : ""}`}
        >
          Pilih file referensi
          <input
            className="sr-only"
            type="file"
            multiple
            accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.txt,.md"
            aria-label="Pilih file referensi"
            disabled={
              disabled ||
              busy ||
              config.isPending ||
              config.isError ||
              !config.data?.uploadAvailable
            }
            onChange={(event) => {
              void upload(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <p className="field-help">
        File privat. Teks dokumen diekstrak; gambar perlu catatan visual atau
        analisis AI. Hindari data rahasia. Referensi yang dihapus dari brief
        dapat tersimpan dalam revisi lama sampai masa retensinya berakhir.
      </p>
      {config.isError && (
        <Notice tone="error">
          Konfigurasi unggahan gagal dimuat.{" "}
          <Button
            type="button"
            variant="ghost"
            onClick={() => void config.refetch()}
          >
            Coba lagi
          </Button>
        </Notice>
      )}
      {config.data && !config.data.uploadAvailable && (
        <Notice>
          Unggahan sementara tidak tersedia. Brief teks tetap dapat disimpan;
          coba lagi setelah layanan pemrosesan dan penyimpanan pulih.
        </Notice>
      )}
      {config.data?.uploadAvailable && !config.data.binaryScanAvailable && (
        <Notice>
          PDF dan DOCX menunggu pemeriksaan keamanan tersedia. Gambar dan teks
          tetap dapat digunakan.
        </Notice>
      )}
      {progress && <p role="status">{progress}</p>}
      {error && <Notice tone="error">{error}</Notice>}
      {query.isError && <Notice tone="error">{message(query.error)}</Notice>}
      <div className="reference-list">
        {files.map((reference) => (
          <ReferenceItem
            key={reference.id}
            reference={reference}
            projectId={projectId!}
            busy={busy}
            vision={Boolean(config.data?.visionAvailable)}
            action={operation}
            onDirty={markDirty}
          />
        ))}
      </div>
    </PreferenceSection>
  );
}
function ReferenceItem({
  reference,
  projectId,
  busy,
  vision,
  action,
  onDirty,
}: {
  reference: ReferenceView;
  projectId: string;
  busy: boolean;
  vision: boolean;
  action: (
    operation: (
      project: PreparedReference,
    ) => Promise<{ briefVersion: number }>,
  ) => Promise<void>;
  onDirty: (id: string, dirty: boolean) => void;
}) {
  const [note, setNote] = useState(reference.note),
    [role, setRole] = useState(reference.role),
    [sourceUrl, setSourceUrl] = useState(reference.sourceUrl),
    [rights, setRights] = useState(reference.rights),
    [saved, setSaved] = useState(false);
  const dirty =
    note !== reference.note ||
    role !== reference.role ||
    sourceUrl !== reference.sourceUrl ||
    rights !== reference.rights;
  useEffect(() => {
    onDirty(reference.id, dirty);
    return () => onDirty(reference.id, false);
  }, [onDirty, reference.id, dirty]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const download = `/api/projects/${projectId}/attachments/${reference.id}/download`;
  const perform = (method: string, operation = "", metadata?: object) => {
    setSaved(false);
    return action(({ id, briefVersion }) =>
      api(
        `/projects/${id}/attachments/${reference.id}${operation ? `/${operation}` : ""}`,
        {
          method,
          headers: { "X-Brief-Version": String(briefVersion) },
          body:
            method === "DELETE"
              ? undefined
              : JSON.stringify({ briefVersion, ...metadata }),
        },
      ),
    )
      .then(() => setSaved(true))
      .catch(() => undefined);
  };
  return (
    <article className="reference-item">
      <div className="reference-item-heading">
        {reference.mime.startsWith("image/") && reference.status === "ready" ? (
          <a href={download} target="_blank" rel="noreferrer">
            <Image
              src={download}
              alt={`Referensi ${reference.name}`}
              width={72}
              height={72}
              unoptimized
            />
          </a>
        ) : (
          <FileText size={28} aria-hidden />
        )}
        <div>
          <strong>{reference.name}</strong>
          <small>
            {(reference.bytes / 1024).toFixed(1)} KiB ·{" "}
            {reference.status === "ready"
              ? "Siap digunakan"
              : reference.status === "rejected"
                ? "Perlu diperbaiki"
                : "Memeriksa file..."}
          </small>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={`Hapus referensi ${reference.name}`}
          disabled={busy}
          onClick={() => void perform("DELETE")}
        >
          <Trash2 size={16} />
        </button>
      </div>
      {reference.status === "rejected" && (
        <Notice tone="error">
          {errors[reference.errorCode ?? ""] ??
            "File belum dapat dibaca. Periksa isinya atau gunakan file lain."}
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => void perform("POST", "retry")}
          >
            <RefreshCw size={14} />
            Coba periksa lagi
          </Button>
        </Notice>
      )}
      {reference.status === "ready" &&
        reference.errorCode === "OCR_REQUIRED" && (
          <Notice>
            PDF ini tidak memuat teks yang dapat diekstrak. Isi catatan
            kebutuhan secara manual atau unggah versi berteks.
          </Notice>
        )}
      <div className="field">
        <label htmlFor={`reference-role-${reference.id}`}>
          Peran referensi
        </label>
        <select
          id={`reference-role-${reference.id}`}
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setSaved(false);
          }}
        >
          <option value="visual">Referensi visual</option>
          <option value="brand">Logo / aset brand</option>
          <option value="content">Konten website</option>
          <option value="requirements">Dokumen kebutuhan</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor={`reference-note-${reference.id}`}>
          Catatan referensi {reference.name}
        </label>
        <textarea
          id={`reference-note-${reference.id}`}
          rows={2}
          maxLength={2000}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setSaved(false);
          }}
          placeholder="Misalnya ikuti grid dan tipografinya; gunakan warna brand sendiri."
        />
      </div>
      <details className="reference-source">
        <summary>Sumber dan hak penggunaan</summary>
        <div className="field">
          <label htmlFor={`reference-url-${reference.id}`}>URL sumber</label>
          <input
            id={`reference-url-${reference.id}`}
            type="url"
            maxLength={2000}
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="field">
          <label htmlFor={`reference-rights-${reference.id}`}>
            Catatan hak penggunaan
          </label>
          <input
            id={`reference-rights-${reference.id}`}
            maxLength={500}
            value={rights}
            onChange={(event) => setRights(event.target.value)}
            placeholder="Aset milik brand / izin penggunaan..."
          />
        </div>
      </details>
      <div className="inline-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={busy || !dirty}
          onClick={() =>
            void perform("PATCH", "", { note, role, sourceUrl, rights })
          }
        >
          Simpan catatan referensi
        </Button>
        {reference.status === "ready" && (
          <a
            className="text-button"
            href={download}
            target="_blank"
            rel="noreferrer"
          >
            Buka file
          </a>
        )}
        {saved && !dirty && <span role="status">Tersimpan</span>}
        {dirty && <small>Catatan belum disimpan</small>}
      </div>
      {reference.status === "ready" &&
        reference.mime.startsWith("image/") &&
        !reference.text && (
          <p className="field-help">
            Gambar belum dianalisis AI. Catatan visual tetap digunakan dalam
            brief.
            {vision &&
              " Analisis mengirim gambar ke provider AI yang dikonfigurasi dan dapat memakai biaya."}
          </p>
        )}
      {vision &&
        reference.status === "ready" &&
        reference.mime.startsWith("image/") && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy || dirty}
            onClick={() => void perform("POST", "analyze")}
          >
            Kirim gambar untuk analisis AI
          </Button>
        )}
      {reference.text && (
        <details className="reference-extraction">
          <summary>Tinjau teks hasil ekstraksi</summary>
          <pre>{reference.text}</pre>
          <small>
            Isi file adalah referensi yang perlu ditinjau; bukan instruksi
            sistem.
          </small>
        </details>
      )}
    </article>
  );
}
