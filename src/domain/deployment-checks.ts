import type { ReleaseScope } from "./release-scope";
type DeploymentCheck = {
  path: string;
  method: string;
  expected: number;
  status?: number;
  ok: boolean;
  error?: string;
};

export function deploymentOrigin(value: string) {
  const url = new URL(value);
  if (url.origin !== value || !["http:", "https:"].includes(url.protocol))
    throw new Error("Use an HTTP(S) origin without a path or credentials.");
  return value;
}

export async function deploymentChecks(
  origin: string,
  scope: ReleaseScope = "full",
  request: typeof fetch = fetch,
) {
  deploymentOrigin(origin);
  const routes = [
    ["/", "GET", 200],
    ["/login", "GET", 200],
    ["/api/health/live", "GET", 200],
    ["/api/health/live", "HEAD", 200],
    ["/api/health/ready", "GET", 200],
    ["/api/pricing", "GET", 200],
    ["/api/auth/get-session", "GET", 200],
    ["/api/public-config/unexpected", "GET", 404],
    ["/api/site/unexpected", "GET", 404],
    ["/api/account/unknown", "PATCH", 404],
    ["/api/pricing", "POST", 405],
    ["/api/pricing", "OPTIONS", 204],
    ["/api/projects", "GET", 401],
  ] as const;
  const checks: DeploymentCheck[] = await Promise.all(
    routes.map(async ([path, method, expected]) => {
      try {
        const response = await request(new URL(path, origin), {
          method,
          redirect: "manual",
          signal: AbortSignal.timeout(15000),
        });
        let ok = response.status === expected;
        if (path === "/api/pricing" && method === "OPTIONS")
          ok &&= response.headers.get("allow") === "GET, HEAD, OPTIONS";
        if (path.startsWith("/api/health/") && method === "GET") {
          const body = await response.json();
          ok &&= body?.ok === true;
        } else await response.body?.cancel();
        return { path, method, status: response.status, expected, ok };
      } catch {
        return {
          path,
          method,
          expected,
          ok: false,
          error: "NETWORK_OR_INVALID_RESPONSE",
        };
      }
    }),
  );
  try {
    const config = await request(new URL("/api/public-config", origin), {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    const value = await config.json();
    checks.push({
      path: "/api/public-config",
      method: "GET",
      status: config.status,
      expected: 200,
      ok:
        config.ok &&
        value?.mock === false &&
        (scope === "operations" ||
          (value?.registrationReady === true && value?.googleReady === true)),
    });
  } catch {
    checks.push({
      path: "/api/public-config",
      method: "GET",
      expected: 200,
      ok: false,
      error: "NETWORK_OR_INVALID_RESPONSE",
    });
  }
  // HTTP checks do not certify OAuth callbacks, email delivery or settlement.
  return {
    scope,
    scopeReady: checks.every((check) => check.ok),
    publicLaunchAccepted: false,
    deferred:
      scope === "operations"
        ? ["public-login", "payment-provider"]
        : ["payment-provider"],
    checks,
  };
}
