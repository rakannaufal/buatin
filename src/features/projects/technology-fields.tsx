"use client";
import { useState } from "react";
import { technologyCatalog, recommendTechnology } from "@/domain/technology";
import {
  resolvePreferences,
  preferenceConflicts,
  type ProjectPreferences,
} from "@/domain/preferences";
import type { WebType } from "@/domain/types";
import { Button, Notice } from "@/components/ui";
import { ModeControl, PreferenceSection } from "./preference-controls";
export function TechnologyFields({
  value,
  webType,
  onChange,
}: {
  value: ProjectPreferences;
  webType: WebType;
  onChange: (value: ProjectPreferences) => void;
}) {
  const [search, setSearch] = useState("");
  const resolved = resolvePreferences(value, webType).technology;
  const conflicts = preferenceConflicts(value, webType);
  return (
    <PreferenceSection
      title="Teknologi website"
      description="Pilih teknologi website yang ingin dibuat. Bagian yang belum dipilih tetap direkomendasikan berdasarkan jenis website."
      summary={`${value.technology.mode === "auto" ? "Rekomendasi otomatis" : "Pilihan manual"} · ${resolved.frontend} · ${resolved.database && resolved.database !== "none" ? resolved.database : "Database sesuai kebutuhan"}`}
    >
      <ModeControl
        label="teknologi"
        value={value.technology.mode}
        onChange={(mode) =>
          onChange({ ...value, technology: { ...value.technology, mode } })
        }
      />
      <div className="recommendation-note">
        <strong>
          {resolved.frontend} + {resolved.styling}
        </strong>
        <p>
          {["landing", "company", "portfolio", "blog"].includes(webType)
            ? "Rendering statis memprioritaskan kecepatan dan SEO. Database ditambahkan ketika fitur memerlukan data persisten."
            : "Aplikasi membutuhkan alur data, akses pengguna dan pengujian. Rekomendasi menjadi awal yang dapat disesuaikan."}
        </p>
        <small>
          Hosting/provider dapat memerlukan akun dan biaya tersendiri. Pilihan
          ini tidak memasang paket atau membeli layanan.
        </small>
      </div>
      {value.technology.mode === "auto" ? (
        <>
          <dl className="recommendation-list">
            {Object.entries(resolved).map(([key, choice]) => (
              <div key={key}>
                <dt>
                  {technologyCatalog.find((entry) => entry.id === key)?.label}
                </dt>
                <dd>{choice}</dd>
              </div>
            ))}
          </dl>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              onChange({
                ...value,
                technology: {
                  ...value.technology,
                  mode: "manual",
                  choices: {
                    ...recommendTechnology(webType),
                    ...value.technology.choices,
                  },
                },
              })
            }
          >
            Sesuaikan rekomendasi teknologi
          </Button>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="technology-search">
              Cari kategori atau teknologi
            </label>
            <input
              id="technology-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Misalnya database, Laravel, pembayaran..."
            />
          </div>
          <p className="field-help">
            {technologyCatalog.length} kategori. Isian manual dikunci saat
            dokumen dibuat.
          </p>
          <div className="technology-fields">
            {technologyCatalog
              .filter((category) =>
                `${category.label} ${category.options.join(" ")}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((category) => (
                <div className="field" key={category.id}>
                  <label htmlFor={`tech-${category.id}`}>
                    {category.label}
                    <span className="field-origin">
                      {value.technology.choices[category.id]
                        ? "Manual"
                        : "Otomatis"}
                    </span>
                  </label>
                  <select
                    id={`tech-${category.id}`}
                    value={value.technology.choices[category.id] ?? ""}
                    onChange={(event) => {
                      const choices = { ...value.technology.choices };
                      if (event.target.value)
                        choices[category.id] = event.target.value;
                      else delete choices[category.id];
                      onChange({
                        ...value,
                        technology: { ...value.technology, choices },
                      });
                    }}
                  >
                    <option value="">
                      Rekomendasikan
                      {resolved[category.id]
                        ? ` (${resolved[category.id]})`
                        : " sesuai fitur"}
                    </option>
                    <option value="none">Tidak diperlukan</option>
                    {category.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
          </div>
          <div className="field">
            <label htmlFor="additional-technology">
              Teknologi tambahan atau arahan khusus
            </label>
            <textarea
              id="additional-technology"
              rows={3}
              maxLength={1200}
              value={value.technology.additional}
              onChange={(event) =>
                onChange({
                  ...value,
                  technology: {
                    ...value.technology,
                    additional: event.target.value,
                  },
                })
              }
              placeholder="Misalnya PostgreSQL di Supabase, API Laravel yang sudah tersedia, atau integrasi khusus."
            />
            <small>
              Permintaan custom dicatat untuk ditinjau, belum divalidasi sebagai
              integrasi siap pakai.
            </small>
          </div>
        </>
      )}
      {!!conflicts.length && (
        <Notice tone="error">
          {conflicts.map((conflict) => (
            <p key={conflict}>{conflict}</p>
          ))}
        </Notice>
      )}
    </PreferenceSection>
  );
}
