export type WebType =
  | "landing"
  | "company"
  | "portfolio"
  | "blog"
  | "ecommerce"
  | "saas"
  | "internal"
  | "booking"
  | "custom";
export interface CatalogEntry {
  id: string;
  path: string;
  kind: "core" | "optional";
  title: string;
  purpose: string;
  requires: string[];
  triggers: string[];
  order: number;
  context_from: string[];
  max_output_tokens: number;
}
export interface WebTypeEntry {
  id: WebType;
  label: string;
  description: string;
  required: string[];
  candidates: string[];
}
export interface PlannedFile {
  id: string;
  path: string;
  reason: string;
  source: "floor" | "type" | "evidence" | "trigger" | "manual" | "dependency";
  locked: boolean;
}
export interface PlannerOutput {
  project_name: string;
  project_slug: string;
  web_type: WebType;
  summary: string;
  complexity: "simple" | "medium" | "complex";
  features_detected: { id: string; evidence: string }[];
  files: {
    id: string;
    decision: "include" | "exclude";
    reason: string;
    confidence: number;
  }[];
  missing_info: { question: string; impact: "high" | "medium" | "low" }[];
  assumptions: string[];
  risks: string[];
}
export interface ResolvedPlan extends PlannerOutput {
  selected: PlannedFile[];
  warnings: string[];
  fallback: boolean;
}
export interface LlmConfig {
  baseUrl: string;
  authMode: "header" | "none";
  planner: string;
  writer: string;
  mock: boolean;
  timeout: number;
  interval: number;
  maxTokens: number;
  maxResponseBytes: number;
  systemAsUser: boolean;
  temperaturePlanner: number;
  temperatureWriter: number;
}
export interface Snapshot {
  brief: string;
  webType: WebType;
  briefVersion: number;
  config: LlmConfig;
  catalog: CatalogEntry[];
  templates: Record<string, string>;
  promptVersion: string;
  writerPrompt: string;
  plan: ResolvedPlan;
  maxRequests: number;
  maxFileRequests: number;
  projectContext?: import("./project-context").ProjectContext;
  regeneration?: { sourceJobId: string; fileIds: string[] };
}
export interface LintIssue {
  code: string;
  message: string;
  severity: "warning" | "error";
  fileId?: string;
  blocksExport: boolean;
}
export const ACTIVE_STATUSES = [
  "queued",
  "running",
  "validating",
  "cancel_requested",
];
export const TERMINAL_STATUSES = [
  "succeeded",
  "partial",
  "failed",
  "cancelled",
];
