import type { ResolvedPlan, LintIssue } from "@/domain/types";
export interface ProjectSummary {
  id: string;
  name: string;
  webType: string;
  status: string;
  briefPreview?: string;
  updatedAt: string;
  jobs: { id: string; status: string; total: number; done: number }[];
}
export interface ProjectDetail extends ProjectSummary {
  brief: string;
  briefVersion: number;
  clarified: boolean;
  preferences: import("@/domain/preferences").ProjectPreferences;
  attachments?: ReferenceView[];
  customization?: import("@/domain/project-context").ProjectContext;
  plans: {
    id: string;
    version: number;
    briefVersion: number;
    data: ResolvedPlan;
  }[];
  tasks: { id: string; status: string; errorCode: string | null }[];
}
export interface ReferenceView {
  id: string;
  name: string;
  mime: string;
  bytes: number;
  checksum: string;
  role: string;
  note: string;
  sourceUrl: string;
  rights: string;
  status: string;
  text: string;
  errorCode: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface JobView {
  id: string;
  workerReady?: boolean;
  project: { id: string; name: string; webType: string };
  status: string;
  total: number;
  done: number;
  failed: number;
  llmRequestCount: number;
  errorCode: string | null;
  lint: LintIssue[];
  manifest: Record<string, unknown>;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  heartbeatAt: string;
  expiresAt: string;
  billingPlanId: string;
  quotaRefundedAt: string | null;
  sourceJobId: string | null;
  mock: boolean;
  plan: ResolvedPlan;
  files: {
    id: string;
    path: string;
    status: string;
    attempts: number;
    modelUsed: string | null;
    tokensIn: number | null;
    tokensOut: number | null;
    errorCode: string | null;
    lint: LintIssue[];
  }[];
}
