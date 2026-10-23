import { expect, it } from "vitest";
const base = process.env.APP_URL!;
it("rejects unknown suffixes before body parsing, auth and mutations", async () => {
  for (const [path, method] of [
    ["/site/unexpected", "GET"],
    ["/public-config/unexpected", "GET"],
    ["/account/typo", "PATCH"],
    ["/projects/fixture/plans/extra", "POST"],
    ["/admin/users/fixture/credits/extra", "POST"],
  ]) {
    const response = await fetch(`${base}/api${path}`, { method });
    expect(response.status, `${method} ${path}`).toBe(404);
  }
});
it("implements HEAD and method-specific OPTIONS without auth or side effects", async () => {
  const head = await fetch(`${base}/api/health/live`, { method: "HEAD" });
  expect(head.status).toBe(200);
  expect(await head.text()).toBe("");
  const options = await fetch(`${base}/api/pricing`, { method: "OPTIONS" });
  expect(options.status).toBe(204);
  expect(options.headers.get("allow")).toBe("GET, HEAD, OPTIONS");
  const invalid = await fetch(`${base}/api/pricing`, { method: "POST" });
  expect(invalid.status).toBe(405);
  expect(invalid.headers.get("allow")).toBe(options.headers.get("allow"));
  expect(
    (await fetch(`${base}/api/jobs/fixture`, { method: "HEAD" })).status,
  ).toBe(401);
});
