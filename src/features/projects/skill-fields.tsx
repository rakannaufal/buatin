"use client";
import { useState } from "react";
import { ExternalLink, LockKeyhole } from "lucide-react";
import { skillCatalog, selectSkills, skillStatusLabels } from "@/domain/skills";
import type { ProjectPreferences } from "@/domain/preferences";
import type { WebType } from "@/domain/types";
import { ModeControl, PreferenceSection } from "./preference-controls";
export function SkillFields({
  value,
  webType,
  onChange,
}: {
  value: ProjectPreferences;
  webType: WebType;
  onChange: (value: ProjectPreferences) => void;
}) {
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("");
  const selected = selectSkills(value, webType);
  return (
    <PreferenceSection
      title="Skill dan panduan"
      description="Koleksi skill yang tersedia beserta sumber, lisensi dan dukungannya. Panduan aktif diterapkan ke dokumen terkait; layanan eksternal memerlukan koneksi sendiri."
      summary={`${value.skills.mode === "auto" ? "Otomatis" : "Manual"} · ${selected.length} aktif · ${skillCatalog.length} dalam katalog`}
    >
      <ModeControl
        label="skill"
        value={value.skills.mode}
        onChange={(mode) =>
          onChange({ ...value, skills: { ...value.skills, mode } })
        }
      />
      {value.skills.mode === "auto" && (
        <button
          type="button"
          className="button button-secondary"
          onClick={() =>
            onChange({
              ...value,
              skills: {
                mode: "manual",
                selected: [
                  ...new Set([
                    ...value.skills.selected,
                    ...selected
                      .filter((skill) => !skill.required)
                      .map((skill) => skill.id),
                  ]),
                ],
              },
            })
          }
        >
          Sesuaikan rekomendasi skill
        </button>
      )}
      <p className="field-help">
        Keamanan dan verifikasi selalu aktif. Mode otomatis memilih panduan
        sesuai jenis website. Skill yang belum siap tetap terlihat dengan
        alasan.
      </p>
      <div className="skill-filters">
        <div className="field">
          <label htmlFor="skill-search">Cari skill</label>
          <input
            id="skill-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Desain, testing, dokumen..."
          />
        </div>
        <div className="field">
          <label htmlFor="skill-category">Kategori skill</label>
          <select
            id="skill-category"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">Semua kategori</option>
            {[...new Set(skillCatalog.map((skill) => skill.category))].map(
              (name) => (
                <option key={name}>{name}</option>
              ),
            )}
          </select>
        </div>
      </div>
      <ul className="skill-list">
        {skillCatalog
          .filter(
            (skill) =>
              (!category || skill.category === category) &&
              `${skill.name} ${skill.description} ${skill.category}`
                .toLowerCase()
                .includes(search.toLowerCase()),
          )
          .map((skill) => (
            <li key={skill.id}>
              <label className="skill-choice">
                <input
                  type="checkbox"
                  checked={selected.some((entry) => entry.id === skill.id)}
                  disabled={
                    skill.required ||
                    skill.status !== "ready" ||
                    value.skills.mode === "auto"
                  }
                  onChange={(event) =>
                    onChange({
                      ...value,
                      skills: {
                        mode: "manual",
                        selected: event.target.checked
                          ? [...value.skills.selected, skill.id]
                          : value.skills.selected.filter(
                              (id) => id !== skill.id,
                            ),
                      },
                    })
                  }
                />
                <span>
                  <strong>
                    {skill.name}
                    {skill.required && (
                      <LockKeyhole size={13} aria-label="Wajib" />
                    )}
                  </strong>
                  <span>{skill.description}</span>
                  <small>
                    {skill.source} · {skill.license}
                  </small>
                  <small>
                    {skill.version}
                    {skill.dependencies.length
                      ? ` · ${skill.dependencies.join(", ")}`
                      : " · Panduan dokumen"}
                  </small>
                </span>
                <span className={`skill-status skill-${skill.status}`}>
                  {skillStatusLabels[skill.status]}
                </span>
              </label>
              {skill.url && (
                <a
                  href={skill.url}
                  target="_blank"
                  rel="noreferrer"
                  className="skill-source"
                >
                  Lihat sumber <ExternalLink size={12} />
                </a>
              )}
            </li>
          ))}
      </ul>
    </PreferenceSection>
  );
}
