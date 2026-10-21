"use client";
import { useState, type CSSProperties } from "react";
import { Plus, Trash2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui";
import {
  contrastRatio,
  hexColor,
  resolvePreferences,
  recommendStyle,
  styleOptions,
  type ProjectPreferences,
  type StyleKey,
  type StyleValues,
} from "@/domain/preferences";
import type { WebType } from "@/domain/types";
import { ModeControl, PreferenceSection } from "./preference-controls";

export function ColorFields({
  value,
  onChange,
}: {
  value: ProjectPreferences;
  onChange: (value: ProjectPreferences) => void;
}) {
  const [copied, setCopied] = useState<number | null>(null);
  const [copyError, setCopyError] = useState("");
  const palette = value.colors.palette;
  const changeColor = (
    index: number,
    update: Partial<(typeof palette)[number]>,
  ) =>
    onChange({
      ...value,
      colors: {
        ...value.colors,
        palette: palette.map((color, i) =>
          i === index ? { ...color, ...update } : color,
        ),
      },
    });
  return (
    <PreferenceSection
      title="Palet warna"
      description="Tentukan warna brand dengan HEX. Primary dan Secondary selalu tersedia; tambahkan warna lain sesuai kebutuhan."
      summary={
        value.colors.mode === "auto"
          ? "Otomatis · palet awal yang dapat disesuaikan"
          : `Manual · ${palette.length} dari 10 warna`
      }
    >
      <ModeControl
        label="warna"
        value={value.colors.mode}
        onChange={(mode) =>
          onChange({ ...value, colors: { ...value.colors, mode } })
        }
      />
      {value.colors.mode === "auto" ? (
        <div className="palette-suggestion">
          <span style={{ backgroundColor: "#235C46" }} />
          <span style={{ backgroundColor: "#C5A16D" }} />
          <p>
            Hijau dalam dan aksen hangat menjadi palet awal. Pilih Manual untuk
            menggunakan warna brand Anda.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              onChange({
                ...value,
                colors: { ...value.colors, mode: "manual" },
              })
            }
          >
            Sesuaikan warna
          </Button>
        </div>
      ) : (
        <>
          <div className="palette-fields">
            {palette.map((color, index) => {
              const parsed = hexColor.safeParse(color.hex);
              const hex = parsed.success ? parsed.data : "#FFFFFF";
              const white = contrastRatio(hex, "#FFFFFF"),
                black = contrastRatio(hex, "#202B27");
              const foreground = white >= black ? "#FFFFFF" : "#202B27";
              return (
                <div className="palette-row" key={index}>
                  <label
                    className="color-picker"
                    style={{ backgroundColor: hex, color: foreground }}
                  >
                    <input
                      type="color"
                      value={hex}
                      aria-label={`Pilih warna ${color.name}`}
                      onChange={(event) =>
                        changeColor(index, {
                          hex: event.target.value.toUpperCase(),
                        })
                      }
                    />
                    <span>Aa</span>
                  </label>
                  <div className="field">
                    <label htmlFor={`color-name-${index}`}>
                      Nama warna {index + 1}
                    </label>
                    <input
                      id={`color-name-${index}`}
                      value={
                        index === 0
                          ? "Primary"
                          : index === 1
                            ? "Secondary"
                            : color.name
                      }
                      readOnly={index < 2}
                      maxLength={40}
                      onChange={(event) =>
                        changeColor(index, { name: event.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`color-hex-${index}`}>
                      HEX{" "}
                      {index === 0
                        ? "Primary"
                        : index === 1
                          ? "Secondary"
                          : color.name}
                    </label>
                    <input
                      id={`color-hex-${index}`}
                      value={color.hex}
                      maxLength={7}
                      spellCheck={false}
                      aria-invalid={!parsed.success}
                      onChange={(event) =>
                        changeColor(index, { hex: event.target.value })
                      }
                      onBlur={() => {
                        if (parsed.success)
                          changeColor(index, { hex: parsed.data });
                      }}
                    />
                    {!parsed.success && (
                      <small className="field-error">
                        Gunakan #RGB atau #RRGGBB.
                      </small>
                    )}
                  </div>
                  <div className="color-actions">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Salin ${color.name}`}
                      disabled={!parsed.success}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(hex);
                          setCopied(index);
                          setCopyError("");
                        } catch {
                          setCopied(null);
                          setCopyError(
                            "Warna gagal disalin. Pilih teks HEX untuk menyalinnya secara manual.",
                          );
                        }
                      }}
                    >
                      {copied === index ? (
                        <Check size={16} />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                    {index > 1 && (
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Hapus warna ${index + 1}`}
                        onClick={() =>
                          onChange({
                            ...value,
                            colors: {
                              ...value.colors,
                              palette: palette.filter((_, i) => i !== index),
                            },
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <p className="color-contrast">
                    Teks putih {white.toFixed(2)}:1 · teks gelap{" "}
                    {black.toFixed(2)}:1.{" "}
                    {Math.max(white, black) >= 4.5
                      ? "Pasangan teks normal tersedia."
                      : "Sesuaikan pasangan teks agar mencapai 4.5:1."}
                  </p>
                </div>
              );
            })}
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={palette.length >= 10}
            onClick={() =>
              onChange({
                ...value,
                colors: {
                  ...value.colors,
                  palette: [
                    ...palette,
                    { name: `Warna ${palette.length + 1}`, hex: "#E4EEE7" },
                  ],
                },
              })
            }
          >
            <Plus size={16} />
            Tambah warna ({palette.length}/10)
          </Button>
          {palette.length === 10 && (
            <p role="status" className="field-help">
              Maksimal 10 warna. Hapus warna tambahan untuk menggantinya.
            </p>
          )}
          {copyError && (
            <p role="alert" className="field-error">
              {copyError}
            </p>
          )}
        </>
      )}
    </PreferenceSection>
  );
}

const labels: Record<StyleKey, string> = {
  direction: "Arah visual",
  headingFont: "Font heading",
  bodyFont: "Font body",
  monoFont: "Font monospace",
  layout: "Layout",
  density: "Kepadatan",
  radius: "Bentuk sudut",
  elevation: "Surface dan bayangan",
  background: "Latar",
  navigation: "Navigasi",
  hero: "Pola hero",
  buttons: "Gaya tombol",
  icons: "Library ikon",
  imagery: "Gaya media",
  motion: "Intensitas animasi",
  easing: "Easing",
  theme: "Tema",
};
const numeric: {
  key: keyof StyleValues;
  label: string;
  min: number;
  max: number;
  step?: number;
}[] = [
  {
    key: "headingWeight",
    label: "Weight heading",
    min: 100,
    max: 900,
    step: 100,
  },
  { key: "bodyWeight", label: "Weight body", min: 100, max: 900, step: 100 },
  { key: "bodySize", label: "Ukuran body (px)", min: 14, max: 24 },
  { key: "typeScale", label: "Type scale", min: 1.05, max: 1.618, step: 0.001 },
  { key: "lineHeight", label: "Line height", min: 1.2, max: 2, step: 0.05 },
  {
    key: "letterSpacing",
    label: "Letter spacing (em)",
    min: -0.04,
    max: 0.1,
    step: 0.01,
  },
  { key: "containerWidth", label: "Lebar kontainer (px)", min: 640, max: 1920 },
  { key: "columns", label: "Jumlah kolom", min: 1, max: 12 },
  { key: "spacing", label: "Basis spacing (px)", min: 2, max: 16 },
  { key: "sectionSpacing", label: "Jarak section (px)", min: 24, max: 160 },
  { key: "duration", label: "Durasi motion (ms)", min: 0, max: 600 },
  {
    key: "mobileBreakpoint",
    label: "Breakpoint mobile (px)",
    min: 320,
    max: 767,
  },
  {
    key: "tabletBreakpoint",
    label: "Breakpoint tablet (px)",
    min: 768,
    max: 1279,
  },
];
export function StyleFields({
  value,
  webType,
  onChange,
}: {
  value: ProjectPreferences;
  webType: WebType;
  onChange: (value: ProjectPreferences) => void;
}) {
  const [search, setSearch] = useState("");
  const style = resolvePreferences(value, webType).style;
  const change = (
    key: keyof StyleValues,
    next: string | number | undefined,
  ) => {
    const values = { ...value.style.values, [key]: next };
    if (next === undefined) delete values[key];
    onChange({ ...value, style: { ...value.style, values } });
  };
  return (
    <PreferenceSection
      title="Gaya dan tipografi"
      description="Arahkan karakter website sampai detail layout dan interaksi. Nilai kosong mengikuti rekomendasi; pilihan manual tetap dipertahankan."
      summary={`${value.style.mode === "auto" ? "Otomatis" : "Manual"} · ${style.direction} · ${style.headingFont} / ${style.bodyFont}`}
    >
      <ModeControl
        label="gaya"
        value={value.style.mode}
        onChange={(mode) =>
          onChange({ ...value, style: { ...value.style, mode } })
        }
      />
      {value.style.mode === "auto" ? (
        <>
          <p>
            Profil <strong>{style.direction}</strong>, layout{" "}
            <strong>{style.layout}</strong>, motion ringan. Rekomendasi
            mengikuti jenis website; pengaturan brand dapat disesuaikan.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              onChange({
                ...value,
                style: {
                  mode: "manual",
                  values: { ...recommendStyle(webType), ...value.style.values },
                },
              })
            }
          >
            Sesuaikan rekomendasi gaya
          </Button>
        </>
      ) : (
        <>
          <div className="field">
            <label htmlFor="style-search">Cari pengaturan gaya atau font</label>
            <input
              id="style-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tipografi, layout, Manrope, animasi..."
            />
          </div>
          <div className="style-fields">
            {(Object.entries(styleOptions) as [StyleKey, readonly string[]][])
              .filter(([key, options]) =>
                `${labels[key]} ${options.join(" ")}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map(([key, options]) => (
                <div className="field" key={key}>
                  <label htmlFor={`style-${key}`}>{labels[key]}</label>
                  <select
                    id={`style-${key}`}
                    value={String(value.style.values[key] ?? "")}
                    onChange={(event) =>
                      change(key, event.target.value || undefined)
                    }
                  >
                    <option value="">
                      Rekomendasikan ({String(recommendStyle(webType)[key])})
                    </option>
                    {options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  {["headingFont", "bodyFont", "monoFont"].includes(key) &&
                    value.style.values[key] === "Custom" && (
                      <>
                        <label htmlFor={`style-custom-${key}`}>
                          Nama {labels[key]}
                        </label>
                        <input
                          id={`style-custom-${key}`}
                          maxLength={160}
                          value={String(
                            value.style.values[
                              `custom${key[0].toUpperCase()}${key.slice(1)}` as keyof StyleValues
                            ] ?? "",
                          )}
                          onChange={(event) =>
                            change(
                              `custom${key[0].toUpperCase()}${key.slice(1)}` as keyof StyleValues,
                              event.target.value,
                            )
                          }
                        />
                      </>
                    )}
                </div>
              ))}
          </div>
          <details className="advanced-style">
            <summary>Ukuran, spacing, responsif dan detail tipografi</summary>
            <div className="style-fields">
              {numeric
                .filter((field) =>
                  field.label.toLowerCase().includes(search.toLowerCase()),
                )
                .map((field) => (
                  <div className="field" key={field.key}>
                    <label htmlFor={`style-${field.key}`}>{field.label}</label>
                    <input
                      id={`style-${field.key}`}
                      type="number"
                      min={field.min}
                      max={field.max}
                      step={field.step ?? 1}
                      placeholder={String(recommendStyle(webType)[field.key])}
                      value={String(value.style.values[field.key] ?? "")}
                      onChange={(event) =>
                        change(
                          field.key,
                          event.target.value === ""
                            ? undefined
                            : Number(event.target.value),
                        )
                      }
                    />
                  </div>
                ))}
              <div className="field">
                <label htmlFor="style-language">Bahasa antarmuka</label>
                <input
                  id="style-language"
                  maxLength={160}
                  value={String(value.style.values.language ?? "")}
                  placeholder="Indonesia"
                  onChange={(event) =>
                    change("language", event.target.value || undefined)
                  }
                />
              </div>
            </div>
          </details>
        </>
      )}
      <p className="field-help">
        Panduan: UI/UX Pro Max, UI Craft, Impeccable dan Emil Design
        Engineering. Font custom memerlukan lisensi serta file/provider yang
        tersedia pada proyek target.
      </p>
      <DesignPreview value={value} webType={webType} />
    </PreferenceSection>
  );
}
export function DesignPreview({
  value,
  webType,
}: {
  value: ProjectPreferences;
  webType: WebType;
}) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const resolved = resolvePreferences(value, webType),
    style = resolved.style;
  const safePalette = resolved.palette
    .map((color) => hexColor.safeParse(color.hex))
    .filter((color) => color.success);
  const primary = safePalette[0]?.data ?? "#235C46",
    dark = style.theme === "Dark";
  const background = dark ? "#17221E" : "#FFFFFF",
    ink = dark ? "#F2F6F3" : "#202B27";
  const foreground =
    contrastRatio(primary, "#FFFFFF") >= contrastRatio(primary, "#202B27")
      ? "#FFFFFF"
      : "#202B27";
  const font = (name: unknown) =>
    name === "Source Serif 4"
      ? '"Source Serif 4", serif'
      : '"Manrope", sans-serif';
  const previewStyle = {
    "--preview-primary": primary,
    "--preview-secondary": safePalette[1]?.data ?? "#C5A16D",
    "--preview-on-primary": foreground,
    "--preview-background": background,
    "--preview-ink": ink,
    "--preview-link": contrastRatio(primary, background) >= 4.5 ? primary : ink,
    "--preview-gap": `${style.density === "Compact" ? 10 : style.density === "Spacious" ? 24 : 16}px`,
    "--preview-radius":
      style.radius === "Square"
        ? "0px"
        : style.radius === "Pill"
          ? "24px"
          : style.radius === "Rounded"
            ? "14px"
            : "6px",
    fontFamily: font(style.bodyFont),
    fontWeight: style.bodyWeight,
    fontSize: `${style.bodySize}px`,
    lineHeight: style.lineHeight,
    letterSpacing: `${style.letterSpacing}em`,
  } as CSSProperties;
  return (
    <section
      className="design-preview-region"
      aria-label="Preview sistem desain"
    >
      <div className="preview-toolbar">
        <strong>Preview sistem desain</strong>
        <div className="preview-viewports">
          <button
            type="button"
            aria-pressed={viewport === "desktop"}
            onClick={() => setViewport("desktop")}
          >
            Desktop
          </button>
          <button
            type="button"
            aria-pressed={viewport === "mobile"}
            onClick={() => setViewport("mobile")}
          >
            Mobile
          </button>
        </div>
      </div>
      <div
        className={`design-preview preview-${viewport}`}
        style={previewStyle}
        data-layout={style.layout}
        data-buttons={style.buttons}
        data-elevation={style.elevation}
        data-background={style.background}
        data-hero={style.hero}
      >
        <div className="preview-navigation">
          <strong>Nama brand</strong>
          <span>Layanan · Tentang</span>
        </div>
        <h3
          style={{
            fontFamily: font(style.headingFont),
            fontWeight: style.headingWeight,
            fontSize: `${(style.typeScale ?? 1.25) ** 2}em`,
          }}
        >
          Ruang untuk ide yang berarti.
        </h3>
        <p>
          Contoh hierarki, warna, dan tipografi website Anda. Konten final
          mengikuti brief proyek.
        </p>
        <div className="preview-content">
          <div className="preview-surface">
            <strong>Layanan utama</strong>
            <p>Informasi yang mudah dibaca, tindakan yang jelas.</p>
            <button type="button" tabIndex={-1} className="preview-cta">
              Hubungi kami
            </button>
          </div>
          <label className="preview-form">
            Email Anda
            <input
              type="email"
              tabIndex={-1}
              placeholder="nama@contoh.com"
              readOnly
            />
          </label>
        </div>
      </div>
      <p className="field-help">
        Preview token, belum website final. Font selain Manrope/Source Serif 4
        memakai fallback lokal. Mode System mengikuti tema perangkat saat
        implementasi target. Motion menghormati reduced motion.
      </p>
    </section>
  );
}
