import { z } from "zod";
import {
  technologyCatalog,
  technologyIds,
  resolveTechnology,
  technologyConflicts,
  type TechnologyCategory,
} from "./technology";
import type { WebType } from "./types";

export const preferenceMode = z.enum(["auto", "manual"]);
const shortText = z
  .string()
  .trim()
  .max(160)
  .refine(
    (value) =>
      !/[<>]/.test(value) &&
      [...value].every((character) => character.charCodeAt(0) >= 32),
    "Gunakan teks biasa.",
  );
export const hexColor = z
  .string()
  .regex(
    /^#(?:[a-fA-F0-9]{3}|[a-fA-F0-9]{6})$/,
    "Gunakan HEX #RGB atau #RRGGBB.",
  )
  .transform((value) => {
    const hex = value.slice(1);
    return `#${hex.length === 3 ? [...hex].map((letter) => letter + letter).join("") : hex}`.toUpperCase();
  });
export const styleOptions = {
  direction: [
    "Minimal",
    "Editorial",
    "Corporate",
    "Playful",
    "Luxury",
    "Brutalist",
    "Retro",
    "Utilitarian",
    "Soft",
    "Material",
    "Flat",
    "Glass",
  ],
  headingFont: [
    "Manrope",
    "Source Serif 4",
    "Space Grotesk",
    "DM Sans",
    "Plus Jakarta Sans",
    "Lora",
    "Fraunces",
    "Libre Baskerville",
    "IBM Plex Sans",
    "Outfit",
    "Sora",
    "Noto Sans",
    "Custom",
  ],
  bodyFont: [
    "Manrope",
    "Source Serif 4",
    "DM Sans",
    "Plus Jakarta Sans",
    "Lora",
    "IBM Plex Sans",
    "Noto Sans",
    "Outfit",
    "Sora",
    "Custom",
  ],
  monoFont: ["IBM Plex Mono", "JetBrains Mono", "Source Code Pro", "Custom"],
  layout: [
    "Centered",
    "Editorial grid",
    "Asymmetric",
    "Sidebar",
    "Split screen",
    "Full width",
  ],
  density: ["Compact", "Comfortable", "Spacious"],
  radius: ["Square", "Subtle", "Rounded", "Pill"],
  elevation: ["Flat", "Border", "Soft shadow", "Layered"],
  background: ["Solid", "Subtle gradient", "Texture", "Photography"],
  navigation: [
    "Top navigation",
    "Sidebar",
    "Sticky header",
    "Minimal",
    "Mega menu",
  ],
  hero: [
    "Text first",
    "Split image",
    "Full image",
    "Product preview",
    "No hero",
  ],
  buttons: ["Solid", "Outline", "Soft", "Text"],
  icons: ["Lucide", "Phosphor", "Heroicons", "Material Symbols"],
  imagery: [
    "Photography",
    "Illustration",
    "Product screenshots",
    "Typography only",
  ],
  motion: ["None", "Subtle", "Expressive"],
  easing: ["Ease out", "Ease in out", "Spring"],
  theme: ["Light", "Dark", "System"],
} as const;
export type StyleKey = keyof typeof styleOptions;
const styleShape = {
  direction: z.enum(styleOptions.direction).optional(),
  headingFont: z.enum(styleOptions.headingFont).optional(),
  bodyFont: z.enum(styleOptions.bodyFont).optional(),
  monoFont: z.enum(styleOptions.monoFont).optional(),
  layout: z.enum(styleOptions.layout).optional(),
  density: z.enum(styleOptions.density).optional(),
  radius: z.enum(styleOptions.radius).optional(),
  elevation: z.enum(styleOptions.elevation).optional(),
  background: z.enum(styleOptions.background).optional(),
  navigation: z.enum(styleOptions.navigation).optional(),
  hero: z.enum(styleOptions.hero).optional(),
  buttons: z.enum(styleOptions.buttons).optional(),
  icons: z.enum(styleOptions.icons).optional(),
  imagery: z.enum(styleOptions.imagery).optional(),
  motion: z.enum(styleOptions.motion).optional(),
  easing: z.enum(styleOptions.easing).optional(),
  theme: z.enum(styleOptions.theme).optional(),
};
export const styleValuesSchema = z
  .object({
    ...styleShape,
    customHeadingFont: shortText.optional(),
    customBodyFont: shortText.optional(),
    customMonoFont: shortText.optional(),
    headingWeight: z.number().int().min(100).max(900).optional(),
    bodyWeight: z.number().int().min(100).max(900).optional(),
    bodySize: z.number().min(14).max(24).optional(),
    typeScale: z.number().min(1.05).max(1.618).optional(),
    lineHeight: z.number().min(1.2).max(2).optional(),
    letterSpacing: z.number().min(-0.04).max(0.1).optional(),
    containerWidth: z.number().int().min(640).max(1920).optional(),
    columns: z.number().int().min(1).max(12).optional(),
    spacing: z.number().int().min(2).max(16).optional(),
    sectionSpacing: z.number().int().min(24).max(160).optional(),
    duration: z.number().int().min(0).max(600).optional(),
    mobileBreakpoint: z.number().int().min(320).max(767).optional(),
    tabletBreakpoint: z.number().int().min(768).max(1279).optional(),
    language: shortText.optional(),
  })
  .strict()
  .superRefine((style, context) => {
    for (const [font, custom] of [
      ["headingFont", "customHeadingFont"],
      ["bodyFont", "customBodyFont"],
      ["monoFont", "customMonoFont"],
    ] as const) {
      if (style[font] === "Custom" && !style[custom]?.trim())
        context.addIssue({
          code: "custom",
          path: [custom],
          message: "Isi nama font custom.",
        });
    }
  });
export type StyleValues = z.infer<typeof styleValuesSchema>;

const choicesSchema = z
  .record(z.string().max(50), z.string().max(100))
  .superRefine((choices, context) => {
    for (const [key, value] of Object.entries(choices)) {
      const category = technologyCatalog.find((item) => item.id === key);
      if (
        !category ||
        (value !== "none" &&
          !(category.options as readonly string[]).includes(value))
      )
        context.addIssue({
          code: "custom",
          message: "Pilihan teknologi tidak dikenal.",
          path: [key],
        });
    }
  })
  .transform(
    (choices) => choices as Partial<Record<TechnologyCategory, string>>,
  );

export const preferencesSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    technology: z
      .object({
        mode: preferenceMode.default("auto"),
        choices: choicesSchema.default({}),
        additional: z.string().trim().max(1200).default(""),
      })
      .strict()
      .default({ mode: "auto", choices: {}, additional: "" }),
    colors: z
      .object({
        mode: preferenceMode.default("auto"),
        palette: z
          .array(z.object({ name: shortText.min(1), hex: hexColor }).strict())
          .min(2)
          .max(10)
          .default([
            { name: "Primary", hex: "#235C46" },
            { name: "Secondary", hex: "#C5A16D" },
          ]),
      })
      .strict()
      .default({
        mode: "auto",
        palette: [
          { name: "Primary", hex: "#235C46" },
          { name: "Secondary", hex: "#C5A16D" },
        ],
      }),
    style: z
      .object({
        mode: preferenceMode.default("auto"),
        values: styleValuesSchema.default({}),
      })
      .strict()
      .default({ mode: "auto", values: {} }),
    skills: z
      .object({
        mode: preferenceMode.default("auto"),
        selected: z
          .array(
            z
              .string()
              .regex(/^[a-z0-9-]+$/)
              .max(100),
          )
          .max(60)
          .refine(
            (ids) => new Set(ids).size === ids.length,
            "Skill tidak boleh duplikat.",
          )
          .default([]),
      })
      .strict()
      .default({ mode: "auto", selected: [] }),
  })
  .strict()
  .default({
    schemaVersion: 1,
    technology: { mode: "auto", choices: {}, additional: "" },
    colors: {
      mode: "auto",
      palette: [
        { name: "Primary", hex: "#235C46" },
        { name: "Secondary", hex: "#C5A16D" },
      ],
    },
    style: { mode: "auto", values: {} },
    skills: { mode: "auto", selected: [] },
  });
export type ProjectPreferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences = () =>
  structuredClone(preferencesSchema.parse(undefined));
export function readPreferences(value: unknown): ProjectPreferences {
  if (
    value === undefined ||
    value === null ||
    (typeof value === "object" && !Object.keys(value).length)
  )
    return defaultPreferences();
  return structuredClone(preferencesSchema.parse(value));
}
export function recommendStyle(webType: WebType): StyleValues {
  return {
    direction: ["blog", "portfolio"].includes(webType)
      ? "Editorial"
      : webType === "internal"
        ? "Utilitarian"
        : "Minimal",
    headingFont: ["blog", "portfolio"].includes(webType)
      ? "Source Serif 4"
      : "Manrope",
    bodyFont: "Manrope",
    monoFont: "IBM Plex Mono",
    layout: ["saas", "internal"].includes(webType) ? "Sidebar" : "Centered",
    density: webType === "internal" ? "Compact" : "Comfortable",
    radius: "Subtle",
    elevation: "Border",
    background: "Solid",
    navigation: ["internal", "saas"].includes(webType)
      ? "Sidebar"
      : "Top navigation",
    hero: ["saas", "internal"].includes(webType) ? "No hero" : "Text first",
    buttons: "Solid",
    icons: "Lucide",
    imagery: "Photography",
    motion: "Subtle",
    easing: "Ease out",
    theme: "Light",
    headingWeight: 600,
    bodyWeight: 400,
    bodySize: 16,
    typeScale: 1.25,
    lineHeight: 1.6,
    letterSpacing: -0.01,
    containerWidth: 1200,
    columns: 12,
    spacing: 8,
    sectionSpacing: 64,
    duration: 180,
    mobileBreakpoint: 640,
    tabletBreakpoint: 1024,
    language: "Indonesia",
  };
}
export function resolvePreferences(
  preferences: ProjectPreferences,
  webType: WebType,
) {
  const manualStyle = Object.fromEntries(
    Object.entries(preferences.style.values).filter(
      ([, value]) => value !== undefined,
    ),
  ) as StyleValues;
  return {
    technology: resolveTechnology(
      webType,
      preferences.technology.mode,
      preferences.technology.choices,
    ),
    additionalTechnology:
      preferences.technology.mode === "manual"
        ? preferences.technology.additional
        : "",
    palette:
      preferences.colors.mode === "manual"
        ? preferences.colors.palette
        : [
            { name: "Primary", hex: "#235C46" },
            { name: "Secondary", hex: "#C5A16D" },
          ],
    style: {
      ...recommendStyle(webType),
      ...(preferences.style.mode === "manual" ? manualStyle : {}),
    },
    modes: {
      technology: preferences.technology.mode,
      colors: preferences.colors.mode,
      style: preferences.style.mode,
      skills: preferences.skills.mode,
    },
    lockedTechnology:
      preferences.technology.mode === "manual"
        ? Object.keys(preferences.technology.choices)
        : [],
    lockedStyle:
      preferences.style.mode === "manual" ? Object.keys(manualStyle) : [],
  };
}
export type ResolvedPreferences = ReturnType<typeof resolvePreferences>;
export function preferenceConflicts(
  preferences: ProjectPreferences,
  webType: WebType,
) {
  return technologyConflicts(
    resolvePreferences(preferences, webType).technology,
  );
}
export function contrastRatio(first: string, second: string) {
  const luminance = (hex: string) => {
    const color = hexColor.safeParse(hex);
    if (!color.success) return 0;
    const channels = [1, 3, 5]
      .map((offset) => parseInt(color.data.slice(offset, offset + 2), 16) / 255)
      .map((value) =>
        value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
      );
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export { technologyIds };
