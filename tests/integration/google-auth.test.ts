import { generateKeyPairSync, sign } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createAuth } from "../../src/server/auth";
import { db, json } from "../../src/server/db";
import { controls } from "../../src/server/admin/policies";

const base = process.env.APP_URL || "http://localhost:3000";
const clientId = "test-only-google.apps.googleusercontent.com";
const prefix = `oauth-${crypto.randomUUID()}`;
const emails = new Set<string>();
const states = new Set<string>();
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
let app: ReturnType<typeof createAuth>;
let claims: Record<string, unknown> = {};
let originalControls: Awaited<ReturnType<typeof db.setting.findUnique>>;

function cookie(response: Response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}
function fixtureEmail() {
  const email = `${prefix}-${emails.size}@localhost.test`;
  emails.add(email);
  return email;
}
async function authRequest(makeRequest: () => Request) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await app.handler(makeRequest());
    if (response.status !== 429) return response;
    const seconds = Number(response.headers.get("x-retry-after") ?? "10");
    expect(Number.isFinite(seconds) && seconds >= 0 && seconds <= 60).toBe(
      true,
    );
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000 + 100));
  }
  throw new Error("Fixture exceeded authentication rate limit after backoff");
}
async function begin() {
  const response = await authRequest(
    () =>
      new Request(`${base}/api/auth/sign-in/social`, {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: "/dashboard",
          errorCallbackURL: "/login",
          disableRedirect: true,
        }),
      }),
  );
  expect(response.status, await response.clone().text()).toBe(200);
  const url = new URL((await response.json()).url);
  expect(url.origin).toBe("https://accounts.google.com");
  expect(url.searchParams.get("redirect_uri")).toBe(
    `${base}/api/auth/callback/google`,
  );
  expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  const state = url.searchParams.get("state")!;
  states.add(`auth-state:${state}`);
  return {
    state,
    cookie: cookie(response),
    nonce: url.searchParams.get("nonce"),
  };
}
async function finish(
  flow: Awaited<ReturnType<typeof begin>>,
  email: string,
  extra: Record<string, unknown> = {},
  cookieOverride?: string,
) {
  const now = Math.floor(Date.now() / 1000);
  claims = {
    iss: "https://accounts.google.com",
    aud: clientId,
    iat: now,
    exp: now + 300,
    sub: `subject-${email}`,
    email,
    email_verified: true,
    name: "Google fixture",
    ...(flow.nonce ? { nonce: flow.nonce } : {}),
    ...extra,
  };
  return authRequest(
    () =>
      new Request(
        `${base}/api/auth/callback/google?state=${encodeURIComponent(flow.state)}&code=test-only-code`,
        { headers: { Cookie: cookieOverride ?? flow.cookie } },
      ),
  );
}
beforeAll(async () => {
  vi.stubEnv("GOOGLE_CLIENT_ID", clientId);
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-only-google-client-secret");
  originalControls = await db.setting.findUnique({
    where: { key: "admin.controls" },
  });
  app = createAuth();
  const fetch = globalThis.fetch;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.href === "https://www.googleapis.com/oauth2/v3/certs")
      return Response.json({
        keys: [
          {
            ...publicKey.export({ format: "jwk" }),
            kid: "fixture-key",
            alg: "RS256",
            use: "sig",
          },
        ],
      });
    if (url.href === "https://oauth2.googleapis.com/token") {
      const body =
        input instanceof Request
          ? await input.clone().text()
          : String(init?.body);
      expect(new URLSearchParams(body).get("code_verifier")).toBeTruthy();
      const unsigned = [
        Buffer.from(
          JSON.stringify({ alg: "RS256", kid: "fixture-key" }),
        ).toString("base64url"),
        Buffer.from(JSON.stringify(claims)).toString("base64url"),
      ].join(".");
      const jwt = `${unsigned}.${sign("RSA-SHA256", Buffer.from(unsigned), privateKey).toString("base64url")}`;
      return Response.json({
        access_token: "test-only-google-access",
        refresh_token: "test-only-google-refresh",
        token_type: "Bearer",
        expires_in: 300,
        id_token: jwt,
      });
    }
    if (
      url.hostname.endsWith("google.com") ||
      url.hostname.endsWith("googleapis.com")
    )
      throw new Error("Unexpected Google network request in fixture");
    return fetch(input, init);
  });
});
afterAll(async () => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await db.emailMessage.deleteMany({ where: { to: { in: [...emails] } } });
  const users = await db.user.findMany({
    where: { email: { in: [...emails] } },
    select: { id: true },
  });
  await db.auditEvent.deleteMany({
    where: { userId: { in: users.map((user) => user.id) } },
  });
  await db.user.deleteMany({ where: { email: { in: [...emails] } } });
  await db.verification.deleteMany({
    where: { identifier: { in: [...states] } },
  });
  if (originalControls)
    await db.setting.update({
      where: { key: "admin.controls" },
      data: {
        value: json(originalControls.value),
        version: originalControls.version,
      },
    });
  else await db.setting.deleteMany({ where: { key: "admin.controls" } });
  await db.$disconnect();
});

it("rejects bad Origin, token login, callback overrides and oversized social requests at the HTTP boundary", async () => {
  const body = {
    provider: "google",
    callbackURL: "/dashboard",
    errorCallbackURL: "/login",
    disableRedirect: true,
  };
  async function request(value: unknown, origin = base) {
    return fetch(`${base}/api/auth/sign-in/social`, {
      method: "POST",
      signal: AbortSignal.timeout(5000),
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
  }
  expect((await request(body, "https://untrusted.example")).status).toBe(403);
  expect(
    (await request({ ...body, idToken: { token: "test-only-token" } })).status,
  ).toBe(400);
  expect(
    (await request({ ...body, callbackURL: "https://untrusted.example" }))
      .status,
  ).toBe(400);
  expect((await request({ ...body, extra: "x".repeat(17000) })).status).toBe(
    413,
  );
  for (const path of ["sign-in/social/", "%73ign-in/social"]) {
    const response = await fetch(`${base}/api/auth/${path}`, {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, idToken: { token: "test-only-token" } }),
    });
    expect([400, 404]).toContain(response.status);
  }
  const valid = await request(body);
  expect(valid.status).toBe(200);
  expect(new URL((await valid.json()).url).origin).toBe(
    "https://accounts.google.com",
  );
});

it("creates a verified user, retains no Google tokens and reuses the same identity on return", async () => {
  const email = fixtureEmail();
  const first = await finish(await begin(), email);
  expect(first.status).toBe(302);
  expect(first.headers.get("location")).toBe("/dashboard");
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  expect(user).toMatchObject({ role: "user", emailVerified: true });
  const session = await app.api.getSession({
    headers: new Headers({ cookie: cookie(first) }),
  });
  expect(session?.user.id).toBe(user.id);
  expect(
    await db.account.findFirstOrThrow({
      where: { userId: user.id, providerId: "google" },
    }),
  ).toMatchObject({ accessToken: null, refreshToken: null, idToken: null });
  const returning = await finish(await begin(), email);
  expect(returning.headers.get("location")).toBe("/dashboard");
  expect(await db.user.count({ where: { email } })).toBe(1);
  expect(
    await db.account.count({
      where: { userId: user.id, providerId: "google" },
    }),
  ).toBe(1);
  expect(
    await db.account.findFirstOrThrow({
      where: { userId: user.id, providerId: "google" },
    }),
  ).toMatchObject({ accessToken: null, refreshToken: null, idToken: null });
  await expect(
    db.account.create({
      data: {
        id: crypto.randomUUID(),
        providerId: "google",
        accountId: `subject-${email}`,
        userId: user.id,
      },
    }),
  ).rejects.toMatchObject({ code: "P2002" });
});

it("rejects unverified identity, wrong audience, missing state cookie and replay", async () => {
  const email = fixtureEmail();
  const unverified = await finish(await begin(), email, {
    email_verified: false,
  });
  expect(unverified.headers.get("location")).toContain(
    "error=email_not_verified",
  );
  const wrongAudience = await finish(await begin(), email, {
    aud: "different-client",
  });
  expect(wrongAudience.headers.get("location")).toContain("error=");
  for (const invalid of [
    { iss: "https://untrusted.example" },
    { exp: Math.floor(Date.now() / 1000) - 60 },
  ]) {
    expect(
      (await finish(await begin(), email, invalid)).headers.get("location"),
    ).toContain("error=");
  }
  expect(await db.user.findUnique({ where: { email } })).toBeNull();
  const flow = await begin();
  const missingCookie = await finish(flow, email, {}, "");
  expect(missingCookie.headers.get("location")).toContain("error=");
  const valid = await begin();
  expect((await finish(valid, email)).headers.get("location")).toBe(
    "/dashboard",
  );
  const replayed = await finish(valid, email);
  expect(replayed.headers.get("location")).toContain("error=");
});

it("keeps application tables behind RLS while server queries continue to work", async () => {
  const [{ protected: protectedTables, total }] = await db.$queryRaw<
    { protected: bigint; total: bigint }[]
  >`
    SELECT count(*) FILTER (WHERE c.relrowsecurity) AS protected, count(*) AS total
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = current_schema() AND c.relkind = 'r' AND c.relname <> '_prisma_migrations'
  `;
  expect(Number(total)).toBe(45);
  expect(protectedTables).toBe(total);
  expect(
    await db.user.count({ where: { email: { in: [...emails] } } }),
  ).toBeGreaterThan(0);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL ROLE pg_read_all_data`;
    const [row] = await tx.$queryRaw<
      { count: bigint }[]
    >`SELECT count(*) FROM "User"`;
    expect(row.count).toBe(0n);
  });
});

it("links only verified matching email and never bypasses staff, MFA or suspension", async () => {
  const email = fixtureEmail();
  const result = await createAuth(true).api.signUpEmail({
    body: {
      email,
      name: "Existing fixture",
      password: `Fixture-${crypto.randomUUID()}`,
    },
  });
  expect(
    (await finish(await begin(), email)).headers.get("location"),
  ).toContain("error=account_not_linked");
  await db.user.update({
    where: { id: result.user.id },
    data: { emailVerified: true },
  });
  expect((await finish(await begin(), email)).headers.get("location")).toBe(
    "/dashboard",
  );
  expect(await db.account.count({ where: { userId: result.user.id } })).toBe(2);
  for (const data of [
    { role: "admin", twoFactorEnabled: false },
    { role: "owner" },
    { role: "user", twoFactorEnabled: true },
  ]) {
    await db.user.update({ where: { id: result.user.id }, data });
    const sessions = await db.session.count({
      where: { userId: result.user.id },
    });
    expect(
      (await finish(await begin(), email)).headers.get("location"),
    ).toContain("error=credential_login_required");
    expect(await db.session.count({ where: { userId: result.user.id } })).toBe(
      sessions,
    );
  }
  await db.user.update({
    where: { id: result.user.id },
    data: { role: "user", twoFactorEnabled: false, status: "suspended" },
  });
  expect(
    (await finish(await begin(), email)).headers.get("location"),
  ).toContain("error=account_unavailable");
});

it("honors signup pause in the OAuth callback while letting existing users return", async () => {
  const email = fixtureEmail();
  expect((await finish(await begin(), email)).headers.get("location")).toBe(
    "/dashboard",
  );
  const { pricingVersion, ...policy } = await controls();
  expect(pricingVersion).toBeGreaterThanOrEqual(0);
  await db.setting.upsert({
    where: { key: "admin.controls" },
    create: {
      key: "admin.controls",
      value: json({ ...policy, pauseSignup: true }),
    },
    update: { value: json({ ...policy, pauseSignup: true }) },
  });
  expect(
    (await finish(await begin(), fixtureEmail())).headers.get("location"),
  ).toContain("error=signup_paused");
  expect((await finish(await begin(), email)).headers.get("location")).toBe(
    "/dashboard",
  );
});
