"use client";
import "./customization.css";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Check,
  FileText,
  Save,
} from "lucide-react";
import { webTypes } from "@/domain/catalog";
import { hasBinaryCharacters } from "@/domain/text";
import { api, post, patch, message } from "@/components/api";
import type { ProjectDetail } from "@/components/api-types";
import { Button, Loading, Notice, Modal } from "@/components/ui";
import { PresetControls } from "@/features/pro/library";
import { Revisions } from "@/features/pro/revisions";
import {
  preferencesSchema,
  readPreferences,
  resolvePreferences,
  preferenceConflicts,
  type ProjectPreferences,
} from "@/domain/preferences";
import { selectSkills } from "@/domain/skills";
import type { WebType } from "@/domain/types";
import { TechnologyFields } from "./technology-fields";
import { ColorFields, StyleFields } from "./design-fields";
import { SkillFields } from "./skill-fields";
import { ReferenceFields } from "./reference-fields";
const schema = z.object({
  name: z.string().trim().min(1, "Beri nama proyek Anda.").max(160),
  webType: z.enum([
    "landing",
    "company",
    "portfolio",
    "blog",
    "ecommerce",
    "saas",
    "internal",
    "booking",
    "custom",
  ]),
  brief: z.string(),
  preferences: z.custom<ProjectPreferences>(
    (value) => preferencesSchema.safeParse(value).success,
    "Periksa warna HEX serta batas pengaturan gaya.",
  ),
});
type Values = z.infer<typeof schema>;
const example =
  "Landing page untuk jasa konsultasi desain bagi pemilik UMKM. Tampilkan layanan, proses kerja, portofolio, dan tombol WhatsApp. Tidak membutuhkan login atau pembayaran. Gaya bersih dengan warna hijau. Prioritas tampilan mobile.";
type EditorLimits = { brief: number; upload: number };
export function ProjectPage({
  id,
  limits,
}: {
  id: string;
  limits: EditorLimits;
}) {
  const query = useQuery({
    queryKey: ["project", id],
    queryFn: () => api<{ project: ProjectDetail }>(`/projects/${id}`),
  });
  if (query.isPending) return <Loading />;
  if (query.isError)
    return <Notice tone="error">{message(query.error)}</Notice>;
  return (
    <ProjectEditor key={id} initial={query.data.project} limits={limits} />
  );
}
export function ProjectEditor({
  initial,
  limits,
  initialPreset,
}: {
  initial?: ProjectDetail;
  limits: EditorLimits;
  initialPreset?: {
    name: string;
    brief: string;
    webType: string;
    preferences?: unknown;
  };
}) {
  const router = useRouter();
  const client = useQueryClient();
  const version = useRef(initial?.briefVersion ?? 1);
  const saved = useRef<Values>({
    name: initial?.name ?? "",
    webType: (initial?.webType ?? "landing") as Values["webType"],
    brief: initial?.brief ?? "",
    preferences: readPreferences(
      initial?.preferences ?? initialPreset?.preferences,
    ),
  });
  const pending = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const createdId = useRef<string | null>(null);
  const [saveStatus, setSaveStatus] = useState(
    initial ? "Tersimpan" : "Draft baru",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [referenceBusy, setReferenceBusy] = useState(false);
  const [referenceDirty, setReferenceDirty] = useState(false);
  const [draftId, setDraftId] = useState(initial?.id ?? null);
  const [characterCount, setCharacterCount] = useState(
    initial?.brief.length ?? initialPreset?.brief.length ?? 0,
  );
  const form = useForm<Values>({
    resolver: zodResolver(
      schema.extend({
        brief: z
          .string()
          .max(
            limits.brief,
            `Maksimal ${limits.brief.toLocaleString("id-ID")} karakter.`,
          ),
      }),
    ),
    defaultValues: {
      name: initial?.name ?? initialPreset?.name ?? "",
      webType: (initial?.webType ??
        initialPreset?.webType ??
        "landing") as Values["webType"],
      brief: initial?.brief ?? initialPreset?.brief ?? "",
      preferences: readPreferences(
        initial?.preferences ?? initialPreset?.preferences,
      ),
    },
  });
  const persist = useCallback(() => {
    // Reserve the save queue before validation yields, including concurrent autosaves.
    const operation = (pending.current ?? Promise.resolve())
      .catch(() => undefined)
      .then(async () => {
        const projectId = initial?.id ?? createdId.current;
        if (!projectId) return;
        if (!(await form.trigger()))
          throw new Error(
            "Periksa isian brief, warna HEX dan pengaturan gaya sebelum menyimpan.",
          );
        const values = form.getValues();
        if (JSON.stringify(values) === JSON.stringify(saved.current)) return;
        setSaveStatus("Menyimpan...");
        await patch<{ project: ProjectDetail }>(`/projects/${projectId}`, {
          ...values,
          briefVersion: version.current,
        })
          .then((result) => {
            version.current = result.project.briefVersion;
            saved.current = values;
            dirty.current =
              JSON.stringify(form.getValues()) !== JSON.stringify(values);
            setSaveStatus(
              dirty.current ? "Perubahan belum tersimpan" : "Tersimpan",
            );
            setError("");
            void client.invalidateQueries({
              queryKey: ["revisions", projectId],
            });
          })
          .catch((err) => {
            setSaveStatus("Gagal menyimpan");
            setError(message(err));
            throw err;
          });
      });
    pending.current = operation;
    return operation.finally(() => {
      if (pending.current === operation) pending.current = null;
    });
  }, [initial, form, client]);
  function schedule() {
    dirty.current = true;
    setCharacterCount(form.getValues("brief").length);
    setSaveStatus(
      initial ? "Perubahan belum tersimpan" : "Draft belum disimpan",
    );
    if (timer.current) clearTimeout(timer.current);
    if (initial || createdId.current)
      timer.current = setTimeout(() => {
        void persist().catch(() => undefined);
      }, 900);
  }
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => {
      window.removeEventListener("beforeunload", before);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  async function submit(values: Values, plan: boolean) {
    setError("");
    setBusy(true);
    if (timer.current) clearTimeout(timer.current);
    try {
      if (referenceDirty)
        throw new Error("Simpan catatan referensi sebelum melanjutkan.");
      if (plan && values.brief.trim().length < 20)
        throw new Error(
          "Isi brief minimal 20 karakter sebelum menyusun rencana.",
        );
      let id = initial?.id ?? createdId.current;
      if (!id) {
        const result = await post<{ project: ProjectDetail }>(
          "/projects",
          values,
        );
        id = result.project.id;
        createdId.current = id;
        version.current = result.project.briefVersion;
        dirty.current = false;
        saved.current = values;
        setDraftId(id);
      } else await persist();
      if (plan) {
        await post(`/projects/${id}/plans`, { briefVersion: version.current });
        await client.invalidateQueries({ queryKey: ["project", id] });
        router.push(`/projects/${id}/plan`);
      } else {
        dirty.current = false;
        await client.invalidateQueries({ queryKey: ["project", id] });
        router.push(`/projects/${id}`);
        router.refresh();
      }
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  async function prepareReference() {
    if (timer.current) clearTimeout(timer.current);
    if (!(await form.trigger()))
      throw new Error(
        "Isi nama proyek dan periksa pengaturan sebelum mengunggah referensi.",
      );
    let id = initial?.id ?? createdId.current;
    if (!id) {
      const values = form.getValues();
      const result = await post<{ project: ProjectDetail }>(
        "/projects",
        values,
      );
      id = result.project.id;
      createdId.current = id;
      version.current = result.project.briefVersion;
      saved.current = values;
      dirty.current = false;
      setDraftId(id);
      setSaveStatus("Tersimpan");
    } else await persist();
    return { id, briefVersion: version.current };
  }
  const preferences = useWatch({ control: form.control, name: "preferences" });
  const webType = useWatch({
    control: form.control,
    name: "webType",
  }) as WebType;
  const resolved = resolvePreferences(preferences, webType);
  const selectedSkills = selectSkills(preferences, webType);
  const conflicts = preferenceConflicts(preferences, webType);
  function changePreferences(next: ProjectPreferences) {
    form.setValue("preferences", next, { shouldDirty: true });
    schedule();
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!/\.(txt|md)$/i.test(file.name) || file.size > limits.upload) {
      setError(
        `Pilih file .txt atau .md maksimal ${Math.floor(limits.upload / 1024)} KiB.`,
      );
      return;
    }
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      if (hasBinaryCharacters(text))
        throw new Error("File bukan teks yang valid.");
      const combined = [form.getValues("brief"), text]
        .filter(Boolean)
        .join("\n\n");
      if (combined.length > limits.brief)
        throw new Error(
          `Gabungan brief melebihi ${limits.brief.toLocaleString("id-ID")} karakter.`,
        );
      form.setValue("brief", combined, {
        shouldDirty: true,
        shouldValidate: true,
      });
      schedule();
    } catch (err) {
      setError(message(err));
    }
  }
  async function removeProject() {
    if (!initial) return;
    setBusy(true);
    setError("");
    try {
      await api(`/projects/${initial.id}`, { method: "DELETE" });
      router.replace("/dashboard");
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  const active = initial?.jobs.some((job) =>
    ["queued", "running", "validating", "cancel_requested"].includes(
      job.status,
    ),
  );
  return (
    <>
      <Link className="back-link" href="/dashboard">
        <ArrowLeft size={15} />
        Ruang kerja
      </Link>
      <div className="page-heading compact">
        <div>
          <span className="tiny-label">Mulai dengan konteks yang jelas</span>
          <h1>{initial ? "Brief proyek" : "Ceritakan website Anda."}</h1>
          <p>Detail yang Anda tulis menjadi dasar seluruh dokumen.</p>
        </div>
        <span className="save-indicator" role="status">
          <Check size={14} />
          {saveStatus}
        </span>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {active && (
        <Notice tone="info">
          Generasi sedang berjalan.{" "}
          <Link href={`/jobs/${initial?.jobs[0]?.id}`}>Lihat progres</Link>.
          Brief dapat diedit setelah proses selesai atau dibatalkan.
        </Notice>
      )}
      {initial && (
        <div className="form-actions">
          <Modal
            title="Hapus proyek?"
            description="Brief, rencana, dan hasil dokumen proyek ini akan dihapus permanen."
            trigger={
              <Button
                variant="danger"
                disabled={active || busy || referenceBusy}
              >
                Hapus proyek
              </Button>
            }
          >
            <p>
              Unduh dokumen yang masih diperlukan sebelum menghapus. Proyek
              tidak dapat dipulihkan melalui aplikasi.
            </p>
            <Button
              variant="danger"
              busy={busy}
              onClick={() => void removeProject()}
            >
              Hapus permanen
            </Button>
          </Modal>
        </div>
      )}
      {initial && (
        <fieldset disabled={busy || referenceBusy}>
          <Revisions id={initial.id} />
        </fieldset>
      )}
      {!active && (
        <fieldset disabled={busy || referenceBusy}>
          <PresetControls
            values={() => form.getValues()}
            apply={(preset) => {
              form.setValue("name", preset.name);
              form.setValue("brief", preset.brief);
              form.setValue("webType", preset.webType as Values["webType"]);
              form.setValue("preferences", readPreferences(preset.preferences));
              schedule();
            }}
          />
        </fieldset>
      )}
      <form
        onSubmit={(event) => {
          void form.handleSubmit((values) => submit(values, true))(event);
        }}
        noValidate
        className="brief-layout"
      >
        <fieldset
          disabled={busy || active || referenceBusy}
          className="brief-main"
        >
          <div className="field">
            <label htmlFor="project-name">Nama proyek</label>
            <input
              id="project-name"
              placeholder="Misalnya: Website Studio Karsa"
              {...form.register("name")}
              onChange={(event) => {
                void form.register("name").onChange(event);
                schedule();
              }}
              aria-invalid={!!form.formState.errors.name}
              aria-describedby="name-error"
            />
            <span id="name-error" className="field-error">
              {form.formState.errors.name?.message}
            </span>
          </div>
          <fieldset className="type-field">
            <legend>Jenis website</legend>
            <p className="field-help">
              Pilih yang paling mendekati kebutuhan Anda.
            </p>
            <div className="type-options">
              {webTypes.map((type) => (
                <label className="type-option" key={type.id}>
                  <input
                    type="radio"
                    value={type.id}
                    {...form.register("webType")}
                    onChange={(event) => {
                      void form.register("webType").onChange(event);
                      schedule();
                    }}
                  />
                  <span>
                    <strong>{type.label}</strong>
                    <small>{type.description}</small>
                  </span>
                  <Check size={15} className="type-check" />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="field brief-field">
            <div className="field-topline">
              <label htmlFor="brief">Brief proyek</label>
              <label className="import-button">
                <Upload size={15} />
                Impor teks
                <input
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  className="sr-only"
                  onChange={(event) => {
                    void importFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                  aria-label="Impor brief .txt atau .md"
                />
              </label>
            </div>
            <textarea
              id="brief"
              rows={12}
              placeholder="Website ini dibuat untuk siapa? Apa yang ingin mereka lakukan? Fitur apa yang wajib ada, dan apa yang tidak diperlukan?"
              {...form.register("brief")}
              onChange={(event) => {
                void form.register("brief").onChange(event);
                schedule();
              }}
              aria-invalid={!!form.formState.errors.brief}
              aria-describedby="brief-help brief-error"
            />
            <div className="textarea-foot">
              <span id="brief-help">
                .txt atau .md ditambahkan ke brief yang ada.
              </span>
              <span
                className={characterCount > limits.brief ? "field-error" : ""}
              >
                {characterCount.toLocaleString("id-ID")} /{" "}
                {limits.brief.toLocaleString("id-ID")}
              </span>
            </div>
            <span id="brief-error" className="field-error">
              {form.formState.errors.brief?.message}
            </span>
          </div>
          <ReferenceFields
            projectId={draftId}
            disabled={busy || active}
            prepare={prepareReference}
            onBusy={setReferenceBusy}
            onDirty={setReferenceDirty}
            onVersion={(next) => {
              version.current = next;
              setSaveStatus("Tersimpan");
            }}
          />
          {referenceDirty && (
            <Notice>
              Simpan catatan referensi agar ikut digunakan dalam rencana.
            </Notice>
          )}
          <fieldset disabled={referenceBusy} className="customization-fields">
            <TechnologyFields
              value={preferences}
              webType={webType}
              onChange={changePreferences}
            />
            <ColorFields value={preferences} onChange={changePreferences} />
            <StyleFields
              value={preferences}
              webType={webType}
              onChange={changePreferences}
            />
            <SkillFields
              value={preferences}
              webType={webType}
              onChange={changePreferences}
            />
          </fieldset>
          {form.formState.errors.preferences && (
            <Notice tone="error">
              {form.formState.errors.preferences.message}
            </Notice>
          )}
          {!!conflicts.length && (
            <Notice tone="error">
              Selesaikan konflik teknologi sebelum menyimpan atau membuat
              rencana.
            </Notice>
          )}
          <div className="form-actions">
            <Button
              variant="secondary"
              type="button"
              busy={busy}
              disabled={referenceBusy || referenceDirty}
              onClick={() =>
                void form.handleSubmit((values) => submit(values, false))()
              }
            >
              <Save size={16} />
              Simpan draft
            </Button>
            <Button
              type="submit"
              busy={busy}
              disabled={referenceBusy || referenceDirty}
            >
              Buat rencana dokumen
              <ArrowRight size={17} />
            </Button>
          </div>
        </fieldset>
        <aside className="brief-aside">
          <div className="brief-configuration-summary">
            <h2>Ringkasan pilihan</h2>
            <dl>
              <div>
                <dt>Teknologi</dt>
                <dd>
                  {resolved.technology.frontend} ·{" "}
                  {resolved.technology.language}
                </dd>
              </div>
              <div>
                <dt>Palet</dt>
                <dd className="summary-swatches">
                  {resolved.palette.map((color, index) => (
                    <span
                      key={index}
                      title={`${color.name}: ${color.hex}`}
                      style={{
                        backgroundColor: /^#[a-fA-F0-9]{3,6}$/.test(color.hex)
                          ? color.hex
                          : "#FFFFFF",
                      }}
                    />
                  ))}
                  <small>
                    {preferences.colors.mode === "auto"
                      ? "Otomatis"
                      : `${resolved.palette.length} warna`}
                  </small>
                </dd>
              </div>
              <div>
                <dt>Gaya</dt>
                <dd>
                  {resolved.style.direction} · {resolved.style.layout}
                </dd>
              </div>
              <div>
                <dt>Skill aktif</dt>
                <dd>{selectedSkills.map((skill) => skill.name).join(", ")}</dd>
              </div>
            </dl>
            <p>
              Semua pilihan diterapkan ke rencana dan dokumen hasil. Pengaturan
              manual tetap dipertahankan.
            </p>
          </div>
          <span className="aside-icon">
            <FileText size={21} />
          </span>
          <h2>Brief yang membantu.</h2>
          <p>
            Tak perlu sempurna. Mulai dengan hal-hal yang sudah Anda ketahui.
          </p>
          <ul className="brief-checklist">
            <li>Tujuan dan masalah yang diselesaikan</li>
            <li>Siapa pengguna utamanya</li>
            <li>Fitur dan halaman wajib</li>
            <li>Identitas visual atau referensi</li>
            <li>Batasan, integrasi, dan tenggat</li>
          </ul>
          <button
            type="button"
            className="text-button"
            disabled={!!initial || busy}
            onClick={() => {
              form.setValue("brief", example, { shouldDirty: true });
              schedule();
            }}
          >
            Gunakan contoh brief
            <ArrowUpRightIcon />
          </button>
          <div className="privacy-note">
            <strong>Tetap jaga privasi.</strong>
            <p>
              Brief diteruskan ke provider AI melalui 9router saat mode nyata
              aktif. Hindari data rahasia.
            </p>
          </div>
        </aside>
      </form>
    </>
  );
}
function ArrowUpRightIcon() {
  return (
    <ArrowRight size={14} style={{ transform: "rotate(-40deg)" }} aria-hidden />
  );
}
