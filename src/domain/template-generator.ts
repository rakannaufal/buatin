/**
 * Deterministic template-based document generator.
 *
 * Replaces the AI-driven generator with synchronous template rendering.
 * Each selected document is rendered from its template using the project's
 * brief, preferences, references and plan — no LLM calls required.
 */

import { renderTemplate } from "./template-engine";
import { resolveVariables } from "./template-variables";
import { applyCustomization } from "./customization-output";
import { lintOutput, manifestFor, type OutputFile } from "./lint";
import type { ProjectContext } from "./project-context";
import type { CatalogEntry, ResolvedPlan, WebType, LintIssue } from "./types";
import type { ResolvedPreferences } from "./preferences";

export interface TemplateSnapshot {
  projectName: string;
  projectSlug: string;
  brief: string;
  webType: WebType;
  plan: ResolvedPlan;
  catalog: CatalogEntry[];
  templates: Record<string, string>;
  preferences: ResolvedPreferences;
  projectContext?: ProjectContext;
}

export interface GeneratedOutput {
  files: OutputFile[];
  issues: LintIssue[];
  manifest: ReturnType<typeof manifestFor>;
}

export function generateFromTemplates(
  snapshot: TemplateSnapshot,
): GeneratedOutput {
  const variables = resolveVariables({
    projectName: snapshot.projectName,
    projectSlug: snapshot.projectSlug,
    brief: snapshot.brief,
    webType: snapshot.webType,
    plan: snapshot.plan,
    preferences: snapshot.preferences,
    skills: snapshot.projectContext?.skills ?? [],
    references: snapshot.projectContext?.references ?? [],
    catalog: snapshot.catalog,
  });

  const files: OutputFile[] = [];

  for (const selected of snapshot.plan.selected) {
    const template = snapshot.templates[selected.id];
    if (!template) continue;

    const docVars: Record<string, unknown> = {
      ...(variables as unknown as Record<string, unknown>),
      skillsForDocument: variables.skills.filter((s) =>
        s.documents.includes(selected.id),
      ),
      currentFileId: selected.id,
      currentFilePath: selected.path,
    };

    let content = renderTemplate(template, docVars);

    // Apply customization (appends locked preferences, skills, references)
    content = applyCustomization(content, selected.id, snapshot.projectContext);

    // Append document list for index
    if (selected.id === "index") {
      content +=
        "\n## Dokumen dalam paket\n\n" +
        snapshot.plan.selected
          .map(
            (f) =>
              `- [${f.path}](${f.id === "agents" ? "../AGENTS.md" : f.path.replace("specs/", "")}): ${f.reason}`,
          )
          .join("\n") +
        "\n";
    }

    // Append read order for agents
    if (selected.id === "agents") {
      content +=
        "\n## Urutan baca\n\n" +
        snapshot.plan.selected
          .filter((f) => f.id !== "agents")
          .map((f) => `- [${f.path}](${f.path})`)
          .join("\n") +
        "\n";
    }

    files.push({
      id: selected.id,
      path: selected.path,
      content,
      finishReason: "complete",
    });
  }

  const issues = lintOutput(files, []);
  const missing = snapshot.plan.selected
    .filter((f) => !files.some((o) => o.id === f.id))
    .map((f) => f.id);

  const manifest = {
    ...manifestFor(
      {
        name: snapshot.projectName,
        slug: snapshot.projectSlug,
        webType: snapshot.webType,
      },
      files,
      issues,
      missing,
      snapshot.plan.assumptions,
    ),
    generationMode: "template" as const,
    customization: snapshot.projectContext
      ? {
          preferences: snapshot.preferences,
          loading: snapshot.projectContext.loading,
          skills: snapshot.projectContext.skills.map(
            ({ id, name, source, version, checksum, license }) => ({
              id,
              name,
              source,
              version,
              checksum,
              license,
            }),
          ),
          references: snapshot.projectContext.references.map(
            ({ id, name, checksum, role, status }) => ({
              id,
              name,
              checksum,
              role,
              status,
            }),
          ),
        }
      : undefined,
  };

  return { files, issues, manifest };
}
