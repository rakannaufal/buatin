import type { WebType, CatalogEntry, ResolvedPlan } from "./types";
import type { ProjectContext, ReferenceSnapshot } from "./project-context";
import type { ResolvedPreferences } from "./preferences";
import { webTypes } from "./catalog";

export interface TemplateVariables {
  projectName: string;
  projectSlug: string;
  brief: string;
  webType: string;
  webTypeLabel: string;
  webTypeDescription: string;
  complexity: string;
  summary: string;
  selectedFiles: {
    id: string;
    path: string;
    reason: string;
    locked: boolean;
  }[];
  assumptions: string[];
  risks: string[];
  missingInfo: { question: string; impact: string }[];
  // Technology
  technologyMode: string;
  technology: Record<string, string>;
  lockedTechnology: string[];
  additionalTechnology: string;
  // Design
  colorMode: string;
  palette: { name: string; hex: string }[];
  primaryColor: string;
  secondaryColor: string;
  styleMode: string;
  style: Record<string, unknown>;
  lockedStyle: string[];
  // Typography shortcuts
  headingFont: string;
  bodyFont: string;
  monoFont: string;
  containerWidth: number;
  spacing: number;
  // Skills
  skills: {
    id: string;
    name: string;
    source: string;
    version: string;
    checksum: string;
    license: string;
    documents: string[];
  }[];
  // References
  references: {
    id: string;
    name: string;
    checksum: string;
    role: string;
    note: string;
    sourceUrl: string;
    rights: string;
    text: string;
    status: string;
    mime: string;
  }[];
  hasReferences: boolean;
  // Web type booleans
  isLanding: boolean;
  isCompany: boolean;
  isPortfolio: boolean;
  isBlog: boolean;
  isEcommerce: boolean;
  isSaas: boolean;
  isInternal: boolean;
  isBooking: boolean;
  isCustom: boolean;
  // Feature booleans (from selected file IDs)
  hasAuth: boolean;
  hasPayments: boolean;
  hasSearch: boolean;
  hasAdmin: boolean;
  hasCms: boolean;
  hasUploads: boolean;
  hasNotifications: boolean;
  hasRealtime: boolean;
  hasBackgroundJobs: boolean;
  hasAnalytics: boolean;
  hasI18n: boolean;
  hasAiFeatures: boolean;
  hasMultitenancy: boolean;
  hasPwaOffline: boolean;
  hasMigration: boolean;
  hasOperations: boolean;
  hasPrivacy: boolean;
  hasDataModel: boolean;
  hasApi: boolean;
  hasIntegrations: boolean;
  hasAssets: boolean;
  hasSeo: boolean;
  // Language
  language: string;
  // Rendering
  renderingStrategy: string;
  // File catalog
  catalog: { id: string; path: string; title: string; purpose: string }[];
}

export function resolveVariables(input: {
  projectName: string;
  projectSlug: string;
  brief: string;
  webType: WebType;
  plan: ResolvedPlan;
  preferences: ResolvedPreferences;
  skills: ProjectContext["skills"];
  references: ProjectContext["references"];
  catalog: CatalogEntry[];
}): TemplateVariables {
  const {
    projectName,
    projectSlug,
    brief,
    webType,
    plan,
    preferences,
    skills,
    references,
    catalog: catalogEntries,
  } = input;

  const typeEntry = webTypes.find((t) => t.id === webType);
  const selectedIds = new Set(plan.selected.map((f) => f.id));

  const hasFile = (id: string) => selectedIds.has(id);

  const technology: Record<string, string> = {};
  for (const [key, value] of Object.entries(preferences.technology)) {
    if (value !== undefined) technology[key] = value;
  }

  const palette = preferences.palette;
  const style = preferences.style;

  return {
    projectName,
    projectSlug,
    brief,
    webType,
    webTypeLabel: typeEntry?.label ?? webType,
    webTypeDescription: typeEntry?.description ?? "",
    complexity: plan.complexity,
    summary: plan.summary,
    selectedFiles: plan.selected.map((f) => ({
      id: f.id,
      path: f.path,
      reason: f.reason,
      locked: f.locked,
    })),
    assumptions: plan.assumptions,
    risks: plan.risks,
    missingInfo: plan.missing_info.map((m) => ({
      question: m.question,
      impact: m.impact,
    })),
    // Technology
    technologyMode: preferences.modes.technology,
    technology,
    lockedTechnology: preferences.lockedTechnology,
    additionalTechnology: preferences.additionalTechnology,
    // Design
    colorMode: preferences.modes.colors,
    palette,
    primaryColor: palette[0]?.hex ?? "#235C46",
    secondaryColor: palette[1]?.hex ?? "#C5A16D",
    styleMode: preferences.modes.style,
    style: style as Record<string, unknown>,
    lockedStyle: preferences.lockedStyle,
    // Typography shortcuts
    headingFont: (style.headingFont as string | undefined) ?? "Manrope",
    bodyFont: (style.bodyFont as string | undefined) ?? "Manrope",
    monoFont: (style.monoFont as string | undefined) ?? "IBM Plex Mono",
    containerWidth: (style.containerWidth as number | undefined) ?? 1200,
    spacing: (style.spacing as number | undefined) ?? 8,
    // Skills
    skills: skills.map((s) => ({
      id: s.id,
      name: s.name,
      source: s.source,
      version: s.version,
      checksum: s.checksum ?? "",
      license: s.license,
      documents: s.documents,
    })),
    // References
    references: (references as ReferenceSnapshot[]).map((r) => ({
      id: r.id,
      name: r.name,
      checksum: r.checksum,
      role: r.role,
      note: r.note,
      sourceUrl: r.sourceUrl,
      rights: r.rights,
      text: r.text,
      status: r.status,
      mime: r.mime,
    })),
    hasReferences: references.length > 0,
    // Web type booleans
    isLanding: webType === "landing",
    isCompany: webType === "company",
    isPortfolio: webType === "portfolio",
    isBlog: webType === "blog",
    isEcommerce: webType === "ecommerce",
    isSaas: webType === "saas",
    isInternal: webType === "internal",
    isBooking: webType === "booking",
    isCustom: webType === "custom",
    // Feature booleans
    hasAuth: hasFile("auth"),
    hasPayments: hasFile("payments"),
    hasSearch: hasFile("search"),
    hasAdmin: hasFile("admin"),
    hasCms: hasFile("cms"),
    hasUploads: hasFile("uploads"),
    hasNotifications: hasFile("notifications"),
    hasRealtime: hasFile("realtime"),
    hasBackgroundJobs: hasFile("background-jobs"),
    hasAnalytics: hasFile("analytics"),
    hasI18n: hasFile("i18n"),
    hasAiFeatures: hasFile("ai-features"),
    hasMultitenancy: hasFile("multitenancy"),
    hasPwaOffline: hasFile("pwa-offline"),
    hasMigration: hasFile("migration"),
    hasOperations: hasFile("operations"),
    hasPrivacy: hasFile("privacy"),
    hasDataModel: hasFile("data-model"),
    hasApi: hasFile("api"),
    hasIntegrations: hasFile("integrations"),
    hasAssets: hasFile("assets"),
    hasSeo: hasFile("seo"),
    // Language
    language: (style.language as string | undefined) ?? "Indonesia",
    // Rendering
    renderingStrategy: technology.rendering ?? "Hybrid",
    // File catalog
    catalog: catalogEntries.map((c) => ({
      id: c.id,
      path: c.path,
      title: c.title,
      purpose: c.purpose,
    })),
  };
}
