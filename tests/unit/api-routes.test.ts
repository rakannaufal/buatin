import { expect, it } from "vitest";
import { apiRoutes, routeMethods } from "../../src/domain/api-routes";

it("matches every registered route exactly and includes HEAD only with GET", () => {
  for (const [pattern, verbs] of apiRoutes) {
    const segments = pattern
      .split("/")
      .map((part) => (part.startsWith(":") ? "fixture-123" : part));
    const methods = routeMethods(segments)!;
    for (const verb of verbs.split(" ")) expect(methods).toContain(verb);
    expect(methods.includes("HEAD")).toBe(methods.includes("GET"));
    expect(methods).toContain("OPTIONS");
    expect(
      routeMethods([...segments, ...Array<string>(6).fill("unexpected")]),
    ).toBeNull();
  }
});
it("rejects path confusion and obsolete mutation aliases", () => {
  for (const segments of [
    [],
    ["account", "typo"],
    ["site", "typo"],
    ["projects", "a/b"],
    ["jobs", ".."],
    ["jobs", "%2f"],
    ["admin", "users", "x", "access", "extra"],
  ])
    expect(routeMethods(segments)).toBeNull();
  expect(routeMethods(["billing", "checkout"])).toEqual(["POST", "OPTIONS"]);
  expect(routeMethods(["admin", "payments", "fixture"])!).not.toContain("POST");
  expect(routeMethods(["admin", "plans", "starter"])!).toBeNull();
});
