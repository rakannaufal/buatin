// Exact contracts keep unused suffixes from reaching permissive dispatchers.
export const apiRoutes: ReadonlyArray<readonly [string, string]> = [
  ["health", "GET"],
  ["health/live", "GET"],
  ["health/ready", "GET"],
  ["pricing", "GET"],
  ["public-config", "GET"],
  ["site", "GET"],
  ["session", "GET"],
  ["processing", "POST"],
  ["account", "GET PATCH"],
  ["account/sessions", "GET"],
  ["account/sessions/:id", "DELETE"],
  ["account/data-requests", "GET POST"],
  ["account/invitations/accept", "POST"],
  ["customization", "GET"],
  ["projects", "GET POST"],
  ["projects/:id", "GET PATCH DELETE"],
  ["projects/:id/plans", "POST"],
  ["projects/:id/plan", "GET PATCH"],
  ["projects/:id/clarification", "POST"],
  ["projects/:id/imports", "POST"],
  ["projects/:id/jobs", "POST"],
  ["projects/:id/attachments", "GET POST"],
  ["projects/:id/attachments/:ref", "PATCH DELETE"],
  ["projects/:id/attachments/:ref/download", "GET"],
  ["projects/:id/attachments/:ref/retry", "POST"],
  ["projects/:id/attachments/:ref/analyze", "POST"],
  ["projects/:id/revisions", "GET POST"],
  ["projects/:id/history", "GET"],
  ["planning-tasks/:id", "GET"],
  ["jobs/:id", "GET"],
  ["jobs/:id/cancel", "POST"],
  ["jobs/:id/resume", "POST"],
  ["jobs/:id/close", "POST"],
  ["jobs/:id/download", "GET"],
  ["jobs/:id/files", "GET"],
  ["jobs/:id/files/:file", "GET"],
  ["jobs/:id/files/:file/download", "GET"],
  ["jobs/:id/compare", "GET"],
  ["jobs/:id/regenerate", "PUT POST"],
  ["billing", "GET"],
  ["billing/quote", "POST"],
  ["billing/checkout", "POST"],
  ["billing/:id", "GET"],
  ["presets", "GET POST"],
  ["presets/:id", "DELETE"],
  ["templates", "GET"],
  ["templates/:id", "PUT DELETE"],
  ["batch-ready", "GET"],
  ["batch", "POST"],
  ["support", "GET POST"],
  ["support/:id", "GET POST"],
  ["settings", "GET PATCH"],
  ["settings/llm-check", "POST"],
  ["admin", "GET"],
  ["admin/operations", "GET"],
  ["admin/identity", "GET"],
  ["admin/reauth", "POST"],
  ["admin/users", "GET"],
  ["admin/users/:id", "GET"],
  ...["suspend", "restore", "sessions", "access", "credits"].map(
    (action) => [`admin/users/:id/${action}`, "POST"] as const,
  ),
  ...["revoke-access", "revoke-credit"].map(
    (action) => [`admin/users/:id/${action}/:grant`, "POST"] as const,
  ),
  ["admin/staff", "GET POST"],
  ["admin/staff/:id/revoke", "POST"],
  ["admin/staff/:id/role", "POST"],
  ["admin/plans", "GET"],
  ["admin/plans/:id/draft", "POST"],
  ["admin/plans/:id/publish", "POST"],
  ["admin/vouchers", "GET POST"],
  ["admin/vouchers/:id", "GET PATCH"],
  ["admin/payments", "GET"],
  ["admin/payments/:id", "GET"],
  ["admin/payments/:id/reconcile", "POST"],
  ["admin/refunds", "GET POST"],
  ["admin/refunds/:id", "POST"],
  ["admin/jobs", "GET"],
  ["admin/jobs/:id/cancel", "POST"],
  ["admin/jobs/:id/resume", "POST"],
  ["admin/ai", "GET"],
  ["admin/audit", "GET"],
  ["admin/privacy", "GET"],
  ["admin/privacy/:id", "POST"],
  ["admin/settings", "GET"],
  ["admin/settings/site", "POST"],
  ["admin/settings/controls", "POST"],
  ["admin/content", "GET POST"],
  ...["review", "publish", "unpublish"].map(
    (action) => [`admin/content/:id/${action}`, "POST"] as const,
  ),
  ["admin/reports", "GET"],
  ["admin/reports/export", "POST"],
  ["admin/support", "GET"],
  ["admin/support/:id", "GET POST"],
];

export function routeMethods(segments: readonly string[]): string[] | null {
  if (
    !segments.length ||
    segments.some((s) => !/^[A-Za-z0-9_-]{1,128}$/.test(s))
  )
    return null;
  const matches = apiRoutes.filter(([pattern]) => {
    const parts = pattern.split("/");
    return (
      parts.length === segments.length &&
      parts.every(
        (part, index) => part.startsWith(":") || part === segments[index],
      )
    );
  });
  if (!matches.length) return null;
  // Literal routes win over parameter routes (e.g. billing/checkout).
  const specificity = ([pattern]: readonly [string, string]) =>
    pattern.split("/").filter((part) => !part.startsWith(":")).length;
  const best = Math.max(...matches.map(specificity));
  const methods = new Set(
    matches
      .filter((r) => specificity(r) === best)
      .flatMap(([, methods]) => methods.split(" ")),
  );
  if (methods.has("GET")) methods.add("HEAD");
  methods.add("OPTIONS");
  return [...methods];
}
