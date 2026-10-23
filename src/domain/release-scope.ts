export type ReleaseScope = "full" | "operations";

export function releaseScope(args: string[]): ReleaseScope {
  const values = args.filter((arg) => arg.startsWith("--scope="));
  if (!values.length) return "full";
  if (
    values.length !== 1 ||
    !["--scope=full", "--scope=operations"].includes(values[0])
  )
    throw new Error("Use --scope=full or --scope=operations once.");
  return values[0] === "--scope=operations" ? "operations" : "full";
}

export function deferredCheck(id: string, scope: ReleaseScope) {
  return (
    scope === "operations" &&
    ["google-auth", "public-auth", "operator-mfa", "payments"].includes(id)
  );
}
