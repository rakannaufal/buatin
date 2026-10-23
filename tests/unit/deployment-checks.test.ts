import { expect, it } from "vitest";
import {
  deploymentChecks,
  deploymentOrigin,
} from "../../src/domain/deployment-checks";
import { deferredCheck, releaseScope } from "../../src/domain/release-scope";

function fixture(
  overrides: Record<string, number> = {},
  healthy = true,
  mock = false,
): typeof fetch {
  return async (input, init) => {
    const path = new URL(String(input)).pathname;
    const method = init?.method || "GET";
    const status =
      overrides[`${method} ${path}`] ??
      (path.includes("unexpected") || path.includes("unknown")
        ? 404
        : method === "POST"
          ? 405
          : method === "OPTIONS"
            ? 204
            : path === "/api/projects"
              ? 401
              : 200);
    const body =
      path === "/api/public-config"
        ? { mock, registrationReady: false, googleReady: false }
        : { ok: healthy };
    return new Response(
      method === "HEAD" || status === 204 ? null : JSON.stringify(body),
      {
        status,
        headers: { allow: "GET, HEAD, OPTIONS" },
      },
    );
  };
}

it("defers provider activation explicitly while retaining full public launch blockers", async () => {
  const operations = await deploymentChecks(
    "https://fixture.example",
    "operations",
    fixture(),
  );
  expect(operations.scopeReady).toBe(true);
  expect(operations.publicLaunchAccepted).toBe(false);
  expect(operations.deferred).toContain("public-login");
  expect(
    (await deploymentChecks("https://fixture.example", "full", fixture()))
      .scopeReady,
  ).toBe(false);
  expect(releaseScope([])).toBe("full");
  expect(() => releaseScope(["--scope=unknown"])).toThrow();
  expect(() => releaseScope(["--scope=full", "--scope=operations"])).toThrow();
  expect(deferredCheck("operator-mfa", "operations")).toBe(true);
  expect(deferredCheck("storage", "operations")).toBe(false);
});

it("still blocks mock mode, worker outages, false health, and anonymous private access", async () => {
  for (const request of [
    fixture({}, true, true),
    fixture({ "GET /api/health/ready": 503 }),
    fixture({}, false),
    fixture({ "GET /api/projects": 200 }),
  ])
    expect(
      (await deploymentChecks("https://fixture.example", "operations", request))
        .scopeReady,
    ).toBe(false);
});

it("does not accept redirected health, malformed responses or credential-bearing origins", async () => {
  for (const value of [
    "https://user:password@fixture.example",
    "https://fixture.example/path",
    "ftp://fixture.example",
  ])
    expect(() => deploymentOrigin(value)).toThrow();
  expect(
    (
      await deploymentChecks(
        "https://fixture.example",
        "operations",
        async () => new Response("not-json"),
      )
    ).scopeReady,
  ).toBe(false);
  expect(
    (
      await deploymentChecks(
        "https://fixture.example",
        "operations",
        fixture({ "GET /api/health/ready": 307 }),
      )
    ).scopeReady,
  ).toBe(false);
});
