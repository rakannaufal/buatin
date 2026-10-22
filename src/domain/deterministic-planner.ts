/**
 * Deterministic planner that replaces the AI-driven planner.
 *
 * Selects documents based on web type requirements, brief trigger matching,
 * and heuristic complexity detection — no LLM calls required.
 */

import type { WebType, PlannerOutput, CatalogEntry } from "./types";
import { catalog } from "./catalog";
import { hasPositiveMention, resolvePlan } from "./planner";
import { slugify } from "./catalog";

interface HeuristicInput {
  brief: string;
  webType: WebType;
  projectName: string;
  entries?: CatalogEntry[];
  maxFiles?: number;
}

/**
 * Detect features from brief text using catalog triggers.
 * Returns feature IDs that have positive mentions in the brief.
 */
function detectFeatures(
  brief: string,
  entries: CatalogEntry[],
): { id: string; evidence: string }[] {
  const detected: { id: string; evidence: string }[] = [];
  for (const entry of entries) {
    for (const trigger of entry.triggers) {
      if (hasPositiveMention(brief, trigger)) {
        detected.push({ id: entry.id, evidence: trigger });
        break;
      }
    }
  }
  return detected;
}

/**
 * Determine complexity based on feature count and web type.
 */
function detectComplexity(
  webType: WebType,
  featureCount: number,
): "simple" | "medium" | "complex" {
  const baseComplexity: Record<WebType, number> = {
    landing: 0,
    company: 1,
    portfolio: 1,
    blog: 2,
    ecommerce: 4,
    saas: 4,
    internal: 3,
    booking: 3,
    custom: 2,
  };
  const score = baseComplexity[webType] + featureCount;
  if (score <= 2) return "simple";
  if (score <= 6) return "medium";
  return "complex";
}

/**
 * Generate standard missing_info questions per web type.
 */
function standardMissingInfo(
  webType: WebType,
): { question: string; impact: "high" | "medium" | "low" }[] {
  const common: { question: string; impact: "high" | "medium" | "low" }[] = [
    {
      question: "Siapa target pengguna utama website ini?",
      impact: "high",
    },
    {
      question: "Apakah ada brand guide atau identitas visual yang sudah ada?",
      impact: "medium",
    },
  ];

  const specific: Record<
    string,
    { question: string; impact: "high" | "medium" | "low" }[]
  > = {
    ecommerce: [
      {
        question: "Berapa jumlah produk yang akan dijual?",
        impact: "high",
      },
      {
        question: "Gateway pembayaran yang diinginkan?",
        impact: "high",
      },
    ],
    saas: [
      {
        question: "Bagaimana model pricing/subscription?",
        impact: "high",
      },
      {
        question: "Fitur utama yang membedakan dari kompetitor?",
        impact: "high",
      },
    ],
    booking: [
      {
        question: "Jenis layanan/ruangan yang bisa dipesan?",
        impact: "high",
      },
      {
        question: "Apakah memerlukan integrasi kalender?",
        impact: "medium",
      },
    ],
    blog: [
      {
        question: "Berapa penulis yang akan berkontribusi?",
        impact: "medium",
      },
    ],
    internal: [
      {
        question: "Berapa jumlah pengguna internal yang diharapkan?",
        impact: "medium",
      },
    ],
  };

  return [...common, ...(specific[webType] ?? [])];
}

/**
 * Generate standard risks per web type and feature set.
 */
function standardRisks(webType: WebType, features: string[]): string[] {
  const risks: string[] = [];

  if (["ecommerce", "saas", "booking"].includes(webType)) {
    risks.push(
      "Keamanan transaksi dan data pembayaran memerlukan audit sebelum produksi.",
    );
  }

  if (features.includes("auth")) {
    risks.push(
      "Implementasi autentikasi harus menggunakan library yang sudah teruji, bukan buatan sendiri.",
    );
  }

  if (features.includes("uploads")) {
    risks.push(
      "File upload memerlukan validasi tipe, ukuran, dan pemindaian malware.",
    );
  }

  if (features.includes("payments")) {
    risks.push(
      "Integrasi pembayaran memerlukan pengujian sandbox sebelum mode produksi.",
    );
  }

  if (features.includes("ai-features")) {
    risks.push(
      "Fitur AI bergantung pada ketersediaan dan biaya provider yang perlu diukur.",
    );
  }

  risks.push(
    "Performa dan aksesibilitas perlu diukur pada perangkat dan jaringan pengguna sebenarnya.",
  );

  return risks;
}

/**
 * Generate a deterministic plan without AI.
 * Uses brief trigger matching, web type requirements, and heuristics.
 */
export function deterministicPlan(input: HeuristicInput): PlannerOutput {
  const entries = input.entries ?? catalog;
  const features = detectFeatures(input.brief, entries);
  const complexity = detectComplexity(input.webType, features.length);
  const featureIds = features.map((f) => f.id);

  return {
    project_name: input.projectName,
    project_slug: slugify(input.projectName),
    web_type: input.webType,
    summary: input.brief.slice(0, 300),
    complexity,
    features_detected: features,
    files: features.map((f) => ({
      id: f.id,
      decision: "include" as const,
      reason: `Brief menyebut "${f.evidence}"`,
      confidence: 0.9,
    })),
    missing_info: standardMissingInfo(input.webType),
    assumptions: [
      "Pemilihan dokumen berdasarkan analisis kata kunci brief dan kebutuhan tipe website.",
    ],
    risks: standardRisks(input.webType, featureIds),
  };
}

/**
 * Full deterministic planning: detect features, resolve plan with dependencies.
 */
export function planDeterministic(input: HeuristicInput) {
  const output = deterministicPlan(input);
  const entries = input.entries ?? catalog;
  return resolvePlan(
    output,
    input.brief,
    input.webType,
    input.maxFiles ?? 42,
    entries,
    false,
  );
}
