const active = new Set([
  "queued",
  "running",
  "validating",
  "cancel_requested",
  "planning",
  "generating",
  "processing",
]);
function pending(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.status === "string" && active.has(item.status);
}
export function needsProcessing(path: string, value: unknown): boolean {
  if (
    !/^\/(?:projects(?:\/[A-Za-z0-9_-]+(?:\/attachments)?)?|jobs\/[A-Za-z0-9_-]+|planning-tasks\/[A-Za-z0-9_-]+)(?:\?[^#]*)?$/.test(
      path,
    ) ||
    !value ||
    typeof value !== "object"
  )
    return false;
  const data = value as Record<string, unknown>;
  return (
    [data.project, data.job, data.task].some(pending) ||
    [data.projects, data.attachments].some(
      (items) => Array.isArray(items) && items.some(pending),
    )
  );
}
