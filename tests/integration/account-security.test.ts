import { afterAll, expect, it } from "vitest";
import { createAuth } from "../../src/server/auth";
import { db } from "../../src/server/db";
import { authenticatorCode } from "../helpers/totp";
const base = process.env.APP_URL || "http://localhost:3000";
let userId = "";
function mergeCookies(current: string, response: Response) {
  const cookies = new Map(
    current
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const [key, ...value] = part.trim().split("=");
        return [key, value.join("=")];
      }),
  );
  for (const item of response.headers.getSetCookie()) {
    const [key, ...value] = item.split(";")[0].split("=");
    cookies.set(key, value.join("="));
  }
  return [...cookies].map(([key, value]) => `${key}=${value}`).join("; ");
}
async function request(
  path: string,
  body?: unknown,
  cookie = "",
  method = "POST",
) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: base,
      Cookie: cookie,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
afterAll(async () => {
  if (userId) {
    await db.dataRequest.deleteMany({ where: { userId } });
    await db.auditEvent.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
  }
  await db.$disconnect();
});
it("enrolls MFA, revokes older sessions, requires a second factor and consumes recovery codes once", async () => {
  const email = `security-${crypto.randomUUID()}@localhost.test`,
    password = `Fixture-${crypto.randomUUID()}`;
  const created = await createAuth(true).api.signUpEmail({
    body: { name: "Security fixture", email, password },
  });
  userId = created.user.id;
  await db.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });
  async function login() {
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await request("/auth/sign-in/email", {
        email,
        password,
      });
      if (response.status !== 429) {
        expect(response.status).toBe(200);
        return response;
      }
      const seconds = Number(
        response.headers.get("retry-after") ||
          response.headers.get("x-retry-after") ||
          10,
      );
      if (!Number.isFinite(seconds) || seconds > 60)
        throw new Error("Unexpected fixture backoff");
      await new Promise((resolve) =>
        setTimeout(resolve, (seconds + 0.1) * 1000),
      );
    }
    throw new Error("Login rate limited");
  }
  let cookie = mergeCookies("", await login());
  const older = mergeCookies("", await login());
  const enabled = await request(
    "/auth/two-factor/enable",
    { password },
    cookie,
  );
  expect(enabled.status).toBe(200);
  const setup = (await enabled.json()) as {
    totpURI: string;
    backupCodes: string[];
  };
  expect(
    (await db.user.findUniqueOrThrow({ where: { id: userId } }))
      .twoFactorEnabled,
  ).toBe(false);
  const code = await authenticatorCode(setup.totpURI);
  const verified = await request(
    "/auth/two-factor/verify-totp",
    { code },
    cookie,
  );
  expect(
    verified.status,
    verified.ok ? undefined : (await verified.clone().json()).message,
  ).toBe(200);
  cookie = mergeCookies(cookie, verified);
  expect((await request("/session", undefined, older, "GET")).status).toBe(401);
  const sessions = await request("/account/sessions", undefined, cookie, "GET");
  const state = await sessions.json();
  expect(state.sessions).toHaveLength(1);
  expect(state.sessions[0]).not.toHaveProperty("token");
  expect(
    (
      await request(
        "/account/data-requests",
        { kind: "deletion", confirmation: "wrong@example.test" },
        cookie,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await request(
        "/account/data-requests",
        { kind: "export", confirmation: email },
        cookie,
      )
    ).status,
  ).toBe(202);
  await request("/auth/sign-out", {}, cookie);
  const challenged = await login();
  expect(await challenged.clone().json()).toMatchObject({
    twoFactorRedirect: true,
  });
  const pending = mergeCookies("", challenged);
  expect((await request("/session", undefined, pending, "GET")).status).toBe(
    401,
  );
  const recovered = await request(
    "/auth/two-factor/verify-backup-code",
    { code: setup.backupCodes[0], trustDevice: false },
    pending,
  );
  expect(recovered.status).toBe(200);
  await request("/auth/sign-out", {}, mergeCookies(pending, recovered));
  const again = mergeCookies("", await login());
  expect(
    (
      await request(
        "/auth/two-factor/verify-backup-code",
        { code: setup.backupCodes[0] },
        again,
      )
    ).ok,
  ).toBe(false);
});
