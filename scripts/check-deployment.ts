export {};
const origin = process.argv[2] || process.env.APP_URL;
if (!origin)
  throw new Error("Usage: npm run deploy:smoke -- https://deployment-origin");
const url = new URL(origin);
if (url.origin !== origin || !["http:", "https:"].includes(url.protocol))
  throw new Error("Use an origin without a path or credentials.");
let failed = false;
for (const [path, method, expected] of [
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
] as const) {
  try {
    const response = await fetch(new URL(path, origin), {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
    });
    const ok = response.status === expected;
    console.log(
      JSON.stringify({ path, method, status: response.status, expected, ok }),
    );
    if (!ok) failed = true;
    if (
      path === "/api/pricing" &&
      method === "OPTIONS" &&
      response.headers.get("allow") !== "GET, HEAD, OPTIONS"
    )
      failed = true;
  } catch {
    console.error(
      JSON.stringify({ path, method, ok: false, error: "NETWORK_OR_TIMEOUT" }),
    );
    failed = true;
  }
}
const config = await fetch(new URL("/api/public-config", origin), {
  signal: AbortSignal.timeout(10000),
});
const value = await config.json();
const publicReady =
  config.ok &&
  value.mock === false &&
  value.registrationReady === true &&
  value.googleReady === true;
console.log(
  JSON.stringify({ check: "public-auth-configuration", ok: publicReady }),
);
if (!publicReady) failed = true;
if (failed) process.exitCode = 1;
