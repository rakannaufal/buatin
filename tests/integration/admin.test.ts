import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Prisma } from "@prisma/client";
import { db, json } from "../../src/server/db";
import { createAuth } from "../../src/server/auth";
import { planFeatures } from "../../src/domain/admin";
import { hash, userLock } from "../../src/server/limits";
import {
  entitlementFor,
  reserveQuota,
  refundQuota,
} from "../../src/server/entitlements";
import { billingQuote, settleVoucher } from "../../src/server/vouchers";
import {
  checkout,
  reconcilePayment,
  receiveCallback,
} from "../../src/server/billing";
import { signDuitku } from "../../src/server/duitku";
import { controls } from "../../src/server/admin/policies";
import { generateJob } from "../../src/worker/generator";
import { clearTestBilling, grantTestPlan } from "../helpers/saas";
import { catalog } from "../../src/domain/catalog";
import { readTemplate } from "../../src/server/templates";
import { publishedTemplates } from "../../src/server/admin/content";
import { authenticatorCode } from "../helpers/totp";

const base = process.env.APP_URL!;
const httpFetch = globalThis.fetch;
type Account = {
  id: string;
  email: string;
  name: string;
  password: string;
  cookie: string;
};
const accounts: Account[] = [],
  voucherIds: string[] = [],
  contentIds: string[] = [];
let owner: Account, admin: Account, user: Account;
let originalPlan: Awaited<ReturnType<typeof db.billingPlan.findUniqueOrThrow>>;
const settings: Awaited<ReturnType<typeof db.setting.findMany>> = [];
const reason = "Reviewed fixture change";
async function account(role = "user") {
  const email = `admin-fixture-${crypto.randomUUID()}@localhost.test`,
    password = `Fixture-${crypto.randomUUID()}`;
  const created = await createAuth(true).api.signUpEmail({
    body: { email, password, name: "Admin fixture" },
  });
  await db.user.update({
    where: { id: created.user.id },
    data: { emailVerified: true, role },
  });
  const response = await createAuth(true).api.signInEmail({
    body: { email, password },
    asResponse: true,
  });
  const cookie = response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const result = { ...created.user, password, cookie };
  accounts.push(result);
  return result;
}
async function api(
  actor: Account | null,
  path: string,
  input?: unknown,
  method = input === undefined ? "GET" : "POST",
  key = crypto.randomUUID(),
) {
  return httpFetch(`${base}/api${path}`, {
    method,
    headers: {
      Origin: base,
      Cookie: actor?.cookie ?? "",
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
}
async function unlock(actor: Account) {
  const response = await api(actor, "/admin/reauth", {
    password: actor.password,
  });
  expect(response.status).toBe(200);
}
async function version(id: string) {
  return (await db.user.findUniqueOrThrow({ where: { id } })).accessVersion;
}
async function jobFor(userId: string) {
  const project = await db.project.create({
    data: {
      userId,
      webType: "landing",
      status: "generating",
      expiresAt: new Date(Date.now() + 86400000),
    },
  });
  const plan = await db.plan.create({
    data: {
      projectId: project.id,
      version: 1,
      briefVersion: 1,
      data: {},
      snapshot: {},
    },
  });
  return db.job.create({
    data: {
      userId,
      projectId: project.id,
      planId: plan.id,
      total: 1,
      status: "failed",
      snapshot: {},
    },
  });
}
async function voucher(maxUses = 1) {
  const code = `FIX${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const response = await api(owner, "/admin/vouchers", {
    reason,
    value: {
      code,
      title: "Fixture promo",
      status: "active",
      kind: "percent",
      value: 10,
      minimumAmount: 0,
      maximumDiscount: null,
      maxUses,
      perUserLimit: 1,
      newCustomersOnly: false,
      planIds: ["plus"],
      userIds: [],
      startsAt: new Date(Date.now() - 60000).toISOString(),
      endsAt: new Date(Date.now() + 86400000).toISOString(),
    },
  });
  expect(response.status).toBe(201);
  const { id } = await response.json();
  voucherIds.push(id);
  return db.voucher.findUniqueOrThrow({ where: { id } });
}
beforeAll(async () => {
  if (await db.user.count({ where: { role: "owner" } }))
    throw new Error(
      "Admin integration requires a dedicated fixture database without an existing owner.",
    );
  originalPlan = await db.billingPlan.findUniqueOrThrow({
    where: { id: "plus" },
  });
  settings.push(
    ...(await db.setting.findMany({
      where: { key: { in: ["admin.controls", "admin.site"] } },
    })),
  );
  owner = await account("owner");
  admin = await account("admin");
  user = await account();
  await unlock(owner);
  await unlock(admin);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
afterAll(async () => {
  if (!originalPlan) {
    await db.$disconnect();
    return;
  }
  for (const fixture of accounts) {
    await db.emailMessage.deleteMany({ where: { to: fixture.email } });
    await clearTestBilling(fixture.id);
    await db.idempotencyKey.deleteMany({ where: { userId: fixture.id } });
    await db.auditEvent.deleteMany({ where: { userId: fixture.id } });
    await db.job.deleteMany({ where: { userId: fixture.id } });
    await db.plan.deleteMany({ where: { project: { userId: fixture.id } } });
    await db.user.delete({ where: { id: fixture.id } });
  }
  await db.adminInvitation.deleteMany({
    where: { invitedBy: { in: accounts.map((a) => a.id) } },
  });
  await db.voucherVersion.deleteMany({
    where: { voucherId: { in: voucherIds } },
  });
  await db.voucher.deleteMany({ where: { id: { in: voucherIds } } });
  await db.contentVersion.deleteMany({ where: { id: { in: contentIds } } });
  await db.billingPlanVersion.deleteMany({
    where: { createdBy: { in: accounts.map((a) => a.id) } },
  });
  await db.settingRevision.deleteMany({
    where: { createdBy: { in: accounts.map((a) => a.id) } },
  });
  await db.setting.deleteMany({
    where: { key: { in: ["admin.controls", "admin.site"] } },
  });
  for (const item of settings)
    await db.setting.create({
      data: {
        ...item,
        value: item.value === null ? Prisma.JsonNull : json(item.value),
      },
    });
  if (originalPlan)
    await db.billingPlan.update({
      where: { id: "plus" },
      data: {
        ...originalPlan,
        features:
          originalPlan.features === null
            ? Prisma.DbNull
            : json(originalPlan.features),
      },
    });
  await db.$disconnect();
});

describe("server-enforced admin management", () => {
  it("publishes operator details with version checks and escapes public notices", async () => {
    const current = await (await api(owner, "/admin/settings")).json();
    const input = {
      version: current.site.version,
      reason,
      value: {
        ...current.site.value,
        operatorName: "Fixture <script>alert(1)</script>",
        operatorAddress: "Fixture correspondence address",
        supportEmail: "legal-fixture@localhost.test",
        termsNotice: "Fixture <strong>terms notice</strong>",
      },
    };
    expect((await api(null, "/admin/settings/site", input)).status).toBe(401);
    expect((await api(user, "/admin/settings/site", input)).status).toBe(403);
    expect((await api(owner, "/admin/settings/site", input)).status).toBe(200);
    const saved = await (await api(owner, "/admin/settings")).json();
    expect(saved.site.value).toEqual(input.value);
    expect(saved.site.version).toBe(current.site.version + 1);
    expect((await api(owner, "/admin/settings/site", input)).status).toBe(409);
    for (const path of ["/terms", "/privacy", "/contact"]) {
      const response = await httpFetch(`${base}${path}`);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Fixture &lt;script&gt;alert(1)&lt;/script&gt;");
      expect(html).toContain("Fixture correspondence address");
      expect(html).toContain('href="mailto:legal-fixture@localhost.test"');
      expect(html).not.toContain("<script>alert(1)</script>");
      if (path === "/terms")
        expect(html).toContain(
          "Fixture &lt;strong&gt;terms notice&lt;/strong&gt;",
        );
    }
  });

  it("denies anonymous/user writes, admin escalation and writes without fresh reauthentication", async () => {
    expect((await api(null, "/admin/users")).status).toBe(401);
    expect((await api(user, "/admin/users")).status).toBe(403);
    expect(
      (await api(admin, "/admin/staff", { email: user.email, reason })).status,
    ).toBe(403);
    const locked = await account("admin");
    const response = await api(locked, `/admin/users/${user.id}/credits`, {
      reason,
      version: await version(user.id),
      amount: 1,
      days: 1,
    });
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("REAUTH_REQUIRED");
    expect(
      (
        await api(owner, "/admin/reauth", {
          password: "invalid-fixture-password",
        })
      ).status,
    ).toBe(403);
    const reauth = await db.auditEvent.findFirstOrThrow({
      where: { userId: owner.id, action: "admin.reauthentication.failed" },
    });
    expect(reauth.result).toBe("denied");
    expect(JSON.stringify(reauth)).not.toContain("invalid-fixture-password");
    expect(
      await db.auditEvent.count({
        where: { userId: owner.id, action: "admin.reauthenticated" },
      }),
    ).toBeGreaterThan(0);
  });
  it("protects the last owner even when demotions race", async () => {
    const alone = await api(owner, `/admin/staff/${owner.id}/role`, {
      role: "user",
      version: await version(owner.id),
      reason,
    });
    expect(alone.status).toBe(409);
    expect((await alone.json()).error.code).toBe("LAST_OWNER");
    const second = await account("owner");
    await unlock(second);
    const responses = await Promise.all([
      api(owner, `/admin/staff/${second.id}/role`, {
        role: "user",
        version: await version(second.id),
        reason,
      }),
      api(second, `/admin/staff/${owner.id}/role`, {
        role: "user",
        version: await version(owner.id),
        reason,
      }),
    ]);
    expect(responses.filter((response) => response.ok)).toHaveLength(1);
    expect(await db.user.count({ where: { role: "owner" } })).toBe(1);
    await db.user.update({ where: { id: owner.id }, data: { role: "owner" } });
    await db.user.update({ where: { id: second.id }, data: { role: "user" } });
    const response = await createAuth(true).api.signInEmail({
      body: { email: owner.email, password: owner.password },
      asResponse: true,
    });
    owner.cookie = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    await unlock(owner);
  });
  it("requires a valid authenticator code when an operator enrolled in MFA reauthenticates", async () => {
    const target = await account("admin");
    const enabled = await api(target, "/auth/two-factor/enable", {
      password: target.password,
    });
    expect(enabled.status).toBe(200);
    const setup = await enabled.json();
    const verified = await api(target, "/auth/two-factor/verify-totp", {
      code: await authenticatorCode(setup.totpURI),
    });
    expect(verified.status).toBe(200);
    const cookies = new Map(
      target.cookie.split("; ").map((part) => {
        const [key, ...value] = part.split("=");
        return [key, value.join("=")];
      }),
    );
    for (const cookie of verified.headers.getSetCookie()) {
      const [key, ...value] = cookie.split(";")[0].split("=");
      cookies.set(key, value.join("="));
    }
    target.cookie = [...cookies]
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
    expect(
      (await api(target, "/admin/reauth", { password: target.password }))
        .status,
    ).toBe(403);
    expect(
      (
        await api(target, "/admin/reauth", {
          password: target.password,
          code: await authenticatorCode(setup.totpURI),
        })
      ).status,
    ).toBe(200);
  });
  it("suspends login/API and cancels queued work before AI, refunding once", async () => {
    const target = await account(),
      job = await jobFor(target.id);
    await db.$transaction(async (tx) => {
      await userLock(tx, target.id);
      await reserveQuota(
        tx,
        target.id,
        job.id,
        await entitlementFor(target.id, tx),
      );
    });
    await db.job.update({ where: { id: job.id }, data: { status: "queued" } });
    const response = await api(owner, `/admin/users/${target.id}/suspend`, {
      reason,
      version: 1,
    });
    expect(response.status).toBe(200);
    expect((await api(target, "/session")).status).toBe(401);
    await expect(
      createAuth(true).api.signInEmail({
        body: { email: target.email, password: target.password },
      }),
    ).rejects.toBeDefined();
    await generateJob(job.id);
    await generateJob(job.id);
    expect(
      await db.job.findUniqueOrThrow({ where: { id: job.id } }),
    ).toMatchObject({
      status: "cancelled",
      llmRequestCount: 0,
      errorCode: "ACCOUNT_SUSPENDED",
    });
    expect(
      (await db.project.findUniqueOrThrow({ where: { id: job.projectId } }))
        .status,
    ).toBe("cancelled");
    expect(
      await db.quotaLedger.count({
        where: { jobId: job.id, action: "refund" },
      }),
    ).toBe(1);
    expect(
      (
        await api(owner, `/admin/users/${target.id}/restore`, {
          reason,
          version: 2,
        })
      ).status,
    ).toBe(200);
  });
  it("binds single-use staff invitations to a verified email and revokes the accepted session", async () => {
    const target = await account();
    const response = await api(owner, "/admin/staff", {
      email: target.email,
      reason,
    });
    expect(response.status).toBe(201);
    const invitation = await response.json();
    const email = await db.emailMessage.findFirstOrThrow({
      where: {
        to: target.email,
        deduplicationKey: hash(`admin-invite:${invitation.id}`),
      },
    });
    const token = new URL(
      email.text.match(/https?:\/\/\S+/)![0],
    ).searchParams.get("invitation")!;
    expect(
      (await api(user, "/account/invitations/accept", { token })).status,
    ).toBe(403);
    expect(
      (await api(target, "/account/invitations/accept", { token })).status,
    ).toBe(200);
    expect((await api(target, "/session")).status).toBe(401);
    expect(
      await db.adminInvitation.findUnique({ where: { id: invitation.id } }),
    ).toMatchObject({
      status: "accepted",
      acceptedBy: target.id,
      tokenHash: hash(token),
    });
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: target.id } })).role,
    ).toBe("admin");
  });
  it("publishes versioned prices, preserves purchased benefits and rejects stale drafts", async () => {
    const target = await account();
    await grantTestPlan(target.id, "plus");
    const prior = await db.billingPlan.findUniqueOrThrow({
      where: { id: "plus" },
    });
    const input = {
      reason,
      version: prior.version,
      value: {
        name: "Plus fixture",
        description: "Fixture",
        monthlyPrice: 10000,
        available: true,
        weeklyQuota: 3,
        retentionDays: 7,
        priority: 2,
        plannerLimit: 6,
        features: { ...planFeatures("plus"), presets: false },
      },
    };
    const response = await api(owner, "/admin/plans/plus/draft", input);
    expect(response.status).toBe(201);
    const draft = await response.json();
    expect(
      (
        await api(owner, "/admin/plans/plus/publish", {
          reason,
          version: prior.version,
          draftId: draft.id,
        })
      ).status,
    ).toBe(200);
    expect(await entitlementFor(target.id)).toMatchObject({
      limit: 10,
      retentionDays: 90,
      features: { presets: true },
    });
    expect((await api(owner, "/admin/plans/plus/draft", input)).status).toBe(
      409,
    );
    expect(
      (await db.billingPlan.findUniqueOrThrow({ where: { id: "plus" } }))
        .monthlyPrice,
    ).toBe(10000);
  });
  it("does not replenish lifetime or weekly usage with grants; bonus refunds return once to their source", async () => {
    const target = await account(),
      first = await jobFor(target.id),
      second = await jobFor(target.id);
    await db.$transaction(async (tx) => {
      await userLock(tx, target.id);
      await reserveQuota(
        tx,
        target.id,
        first.id,
        await entitlementFor(target.id, tx),
      );
    });
    const key = crypto.randomUUID(),
      input = { reason, version: 1, amount: 1, days: 7 };
    const responses = await Promise.all([
      api(owner, `/admin/users/${target.id}/credits`, input, "POST", key),
      api(owner, `/admin/users/${target.id}/credits`, input, "POST", key),
    ]);
    expect(responses.every((r) => r.ok)).toBe(true);
    expect(await db.creditGrant.count({ where: { userId: target.id } })).toBe(
      1,
    );
    await db.$transaction(async (tx) => {
      await userLock(tx, target.id);
      await reserveQuota(
        tx,
        target.id,
        second.id,
        await entitlementFor(target.id, tx),
      );
    });
    expect(await db.quotaLedger.count({ where: { jobId: second.id } })).toBe(0);
    await Promise.all(
      [1, 2].map(() =>
        db.$transaction(async (tx) => {
          await userLock(tx, target.id);
          await refundQuota(tx, target.id, second.id, "fixture");
        }),
      ),
    );
    expect(await entitlementFor(target.id)).toMatchObject({
      used: 1,
      baseRemaining: 0,
      creditRemaining: 1,
    });
    const paid = await grantTestPlan(target.id, "plus");
    const grant = await api(owner, `/admin/users/${target.id}/access`, {
      reason,
      version: 1,
      planId: "plus",
      days: 7,
    });
    expect(grant.status).toBe(200);
    expect(
      (
        await db.entitlementGrant.findFirstOrThrow({
          where: { userId: target.id },
        })
      ).startsAt,
    ).toEqual(paid.endsAt);
    expect(await db.payment.count({ where: { userId: target.id } })).toBe(1);
    await db.subscription.update({
      where: { id: paid.id },
      data: { revokedAt: new Date() },
    });
    expect(await entitlementFor(target.id)).toMatchObject({
      planId: "free",
      used: 1,
      baseRemaining: 0,
    });
  });
  it("enforces owner-configured cumulative admin credits and hard environment ceilings", async () => {
    const policy = await controls();
    const { pricingVersion: _pricingVersion, ...value } = policy;
    void _pricingVersion;
    const current = await db.setting.findUnique({
      where: { key: "admin.controls" },
    });
    const input = {
      reason,
      version: current?.version ?? 0,
      value: { ...value, adminCreditLimit: 2, adminGrantDays: 7 },
    };
    expect((await api(admin, "/admin/settings/controls", input)).status).toBe(
      403,
    );
    expect(
      (
        await api(owner, "/admin/settings/controls", {
          ...input,
          value: { ...input.value, dailyRequests: 1000000000 },
        })
      ).status,
    ).toBe(400);
    expect((await api(owner, "/admin/settings/controls", input)).status).toBe(
      200,
    );
    const a = await account(),
      b = await account();
    const responses = await Promise.all(
      [a, b].map((target) =>
        api(admin, `/admin/users/${target.id}/credits`, {
          reason,
          version: 1,
          amount: 2,
          days: 1,
        }),
      ),
    );
    expect(responses.filter((r) => r.ok)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 403)).toHaveLength(1);
    expect(
      await db.creditGrant.aggregate({
        where: { createdBy: admin.id },
        _sum: { amount: true },
      }),
    ).toMatchObject({ _sum: { amount: 2 } });
  });
  it("reserves the last voucher slot once and consumes duplicate paid callbacks once", async () => {
    const promo = await voucher(),
      a = await account(),
      b = await account();
    vi.stubEnv("DUITKU_MERCHANT_CODE", "DFIXTURE");
    vi.stubEnv("DUITKU_API_KEY", "fixture-merchant-key");
    const [qa, qb] = await Promise.all([
      billingQuote(a.id, "plus", promo.code),
      billingQuote(b.id, "plus", promo.code),
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, options: RequestInit) => {
        const body = JSON.parse(String(options.body));
        return url.endsWith("getpaymentmethod")
          ? Response.json({
              responseCode: "00",
              paymentFee: [{ paymentMethod: "NQ" }],
            })
          : Response.json({
              statusCode: "00",
              reference: `ref-${body.merchantOrderId}`,
              amount: "9000",
              qrString: "QRIS fixture",
            });
      }),
    );
    const orders = await Promise.allSettled([
      checkout(a, "plus", "voucher-concurrent-a", qa),
      checkout(b, "plus", "voucher-concurrent-b", qb),
    ]);
    expect(orders.filter((o) => o.status === "fulfilled")).toHaveLength(1);
    const winner = orders.find((o) => o.status === "fulfilled")!;
    if (winner.status !== "fulfilled") throw new Error("Missing winner");
    const payment = await db.payment.findUniqueOrThrow({
      where: { id: winner.value.id },
    });
    expect(payment).toMatchObject({
      amount: 9000,
      subtotal: 10000,
      discount: 1000,
    });
    await expect(
      checkout(a, "plus", "tampered-quote", { ...qa, amount: 1 }),
    ).rejects.toMatchObject({ code: "QUOTE_EXPIRED" });
    const callback = {
      merchantCode: "DFIXTURE",
      merchantOrderId: payment.id,
      amount: "9000",
      reference: payment.reference!,
      paymentCode: "NQ",
      resultCode: "00",
      signature: signDuitku(
        `DFIXTURE9000${payment.id}`,
        "fixture-merchant-key",
      ),
    };
    await Promise.all([receiveCallback(callback), receiveCallback(callback)]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          merchantOrderId: payment.id,
          reference: payment.reference,
          amount: "9000",
          statusCode: "00",
        }),
      ),
    );
    await Promise.all([
      reconcilePayment(payment.id),
      reconcilePayment(payment.id),
    ]);
    expect(
      await db.subscription.count({ where: { paymentId: payment.id } }),
    ).toBe(1);
    expect(
      await db.voucherRedemption.findUnique({
        where: { paymentId: payment.id },
      }),
    ).toMatchObject({ status: "consumed" });
    const changed = await api(
      owner,
      `/admin/vouchers/${promo.id}`,
      {
        reason,
        version: promo.version,
        value: {
          ...promo,
          id: undefined,
          version: undefined,
          createdAt: undefined,
          updatedAt: undefined,
          code: promo.code,
          startsAt: promo.startsAt.toISOString(),
          endsAt: promo.endsAt.toISOString(),
          maxUses: 1,
        },
      },
      "PATCH",
    );
    expect(changed.status).toBe(200);
    expect(
      await db.voucherVersion.count({ where: { voucherId: promo.id } }),
    ).toBe(2);
  });
  it("retains voucher reservation after ambiguous provider results and flags late paid after release", async () => {
    const promo = await voucher(),
      target = await account();
    vi.stubEnv("DUITKU_MERCHANT_CODE", "DFIXTURE");
    vi.stubEnv("DUITKU_API_KEY", "fixture-merchant-key");
    const quote = await billingQuote(target.id, "plus", promo.code);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("fixture ambiguous timeout");
      }),
    );
    const result = await checkout(target, "plus", "ambiguous-checkout", quote);
    expect(
      await db.voucherRedemption.findUnique({
        where: { paymentId: result.id },
      }),
    ).toMatchObject({ status: "reserved" });
    expect(
      (await checkout(target, "plus", "ambiguous-checkout", quote)).id,
    ).toBe(result.id);
    await db.$transaction(async (tx) => {
      await userLock(tx, target.id);
      await settleVoucher(tx, result.id, false);
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          merchantOrderId: result.id,
          reference: `late-${result.id}`,
          amount: "9000",
          statusCode: "00",
        }),
      ),
    );
    await reconcilePayment(result.id);
    expect(
      await db.payment.findUnique({ where: { id: result.id } }),
    ).toMatchObject({ status: "paid" });
    expect(
      await db.voucherRedemption.findUnique({
        where: { paymentId: result.id },
      }),
    ).toMatchObject({ status: "review" });
  });
  it("requires a fresh quote after package publication and rejects expired consent", async () => {
    const target = await account(),
      quote = await billingQuote(target.id, "plus");
    vi.stubEnv("DUITKU_MERCHANT_CODE", "DFIXTURE");
    vi.stubEnv("DUITKU_API_KEY", "fixture-merchant-key");
    const plan = await db.billingPlan.findUniqueOrThrow({
      where: { id: "plus" },
    });
    await db.billingPlan.update({
      where: { id: "plus" },
      data: { version: { increment: 1 }, monthlyPrice: 12000 },
    });
    try {
      await expect(
        checkout(target, "plus", "stale-price-quote", quote),
      ).rejects.toMatchObject({ code: "PRICE_CHANGED" });
    } finally {
      await db.billingPlan.update({
        where: { id: "plus" },
        data: { version: plan.version, monthlyPrice: plan.monthlyPrice },
      });
    }
    vi.spyOn(Date, "now").mockReturnValue(quote.expiresAt + 1);
    await expect(
      checkout(target, "plus", "expired-price-quote", quote),
    ).rejects.toMatchObject({ code: "QUOTE_EXPIRED" });
    expect(await db.payment.count({ where: { userId: target.id } })).toBe(0);
  });
  it("never downgrades paid status when an admin reconciliation waits on the account lock", async () => {
    const target = await account(),
      paid = await grantTestPlan(target.id, "plus");
    await expect(
      db.user.delete({ where: { id: target.id } }),
    ).rejects.toMatchObject({ code: "P2003" });
    await db.payment.update({
      where: { id: paid.paymentId },
      data: { status: "pending" },
    });
    let release!: () => void, acquired!: () => void;
    const lockReady = new Promise<void>((resolve) => {
      acquired = resolve;
    });
    const unlockLock = new Promise<void>((resolve) => {
      release = resolve;
    });
    const blocker = db.$transaction(
      async (tx) => {
        await userLock(tx, target.id);
        acquired();
        await unlockLock;
        await tx.payment.update({
          where: { id: paid.paymentId },
          data: { status: "paid" },
        });
      },
      { timeout: 10000 },
    );
    await lockReady;
    const response = api(owner, `/admin/payments/${paid.paymentId}/reconcile`, {
      reason,
    });
    try {
      await expect
        .poll(
          async () => {
            const locks = await db.$queryRaw<
              { n: bigint }[]
            >`SELECT count(*)::bigint n FROM pg_locks WHERE locktype='advisory' AND NOT granted`;
            return Number(locks[0].n);
          },
          { timeout: 5000 },
        )
        .toBeGreaterThan(0);
    } finally {
      release();
    }
    await blocker;
    expect((await response).status).toBe(202);
    expect(
      (await db.payment.findUniqueOrThrow({ where: { id: paid.paymentId } }))
        .status,
    ).toBe("paid");
  });
  it("requires owner approval, ordered transitions and merchant evidence for monetary refunds", async () => {
    const target = await account(),
      paid = await grantTestPlan(target.id, "plus");
    const requested = await api(admin, "/admin/refunds", {
      reason,
      paymentId: paid.paymentId,
    });
    expect(requested.status).toBe(201);
    const refund = await requested.json();
    expect(
      (
        await api(admin, `/admin/refunds/${refund.id}`, {
          reason,
          version: 1,
          status: "approved",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await api(owner, `/admin/refunds/${refund.id}`, {
          reason,
          version: 1,
          status: "approved",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await api(owner, `/admin/refunds/${refund.id}`, {
          reason,
          version: 2,
          status: "completed",
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await api(owner, `/admin/refunds/${refund.id}`, {
          reason,
          version: 2,
          status: "processing",
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await api(owner, `/admin/refunds/${refund.id}`, {
          reason,
          version: 3,
          status: "completed",
        })
      ).status,
    ).toBe(400);
    const key = crypto.randomUUID(),
      input = {
        reason,
        version: 3,
        status: "completed",
        evidence: "Verified fixture merchant transfer receipt",
        providerReference: `fixture-${refund.id}`,
      };
    expect(
      (await api(owner, `/admin/refunds/${refund.id}`, input, "POST", key))
        .status,
    ).toBe(200);
    expect(
      (await api(owner, `/admin/refunds/${refund.id}`, input, "POST", key))
        .status,
    ).toBe(200);
    expect(
      (
        await api(admin, "/admin/refunds", {
          reason,
          paymentId: paid.paymentId,
        })
      ).status,
    ).toBe(409);
    expect(await entitlementFor(target.id)).toMatchObject({ planId: "free" });
    expect(
      (await db.payment.findUniqueOrThrow({ where: { id: paid.paymentId } }))
        .status,
    ).toBe("paid");
  });
  it("protects support ownership, hides internal notes and deduplicates messages", async () => {
    const key = crypto.randomUUID(),
      input = {
        subject: "Fixture billing help",
        message: "Please review this invoice issue",
      };
    const created = await api(user, "/support", input, "POST", key);
    expect(created.status).toBe(201);
    const ticket = await created.json();
    expect(
      await (await api(user, "/support", input, "POST", key)).json(),
    ).toEqual(ticket);
    expect((await api(admin, `/support/${ticket.id}`)).status).toBe(404);
    const message = {
      reason,
      version: 1,
      message: "PRIVATE INTERNAL FIXTURE",
      internal: true,
      status: "waiting",
      priority: "high",
      assignedTo: owner.id,
    };
    expect(
      (await api(owner, `/admin/support/${ticket.id}`, message)).status,
    ).toBe(200);
    const publicView = await (await api(user, `/support/${ticket.id}`)).json();
    expect(JSON.stringify(publicView)).not.toContain(
      "PRIVATE INTERNAL FIXTURE",
    );
    const replyKey = crypto.randomUUID(),
      reply = { message: "Additional fixture context" };
    await Promise.all([
      api(user, `/support/${ticket.id}`, reply, "POST", replyKey),
      api(user, `/support/${ticket.id}`, reply, "POST", replyKey),
    ]);
    expect(
      await db.supportMessage.count({
        where: { ticketId: ticket.id, internal: false },
      }),
    ).toBe(2);
  });
  it("paginates support history from newest messages without leaking internal notes", async () => {
    const time = Date.now() - 60000;
    const ticket = await db.supportTicket.create({
      data: {
        userId: user.id,
        subject: "Paginated history fixture",
        messages: {
          create: [
            ...Array.from({ length: 105 }, (_, index) => ({
              authorId: user.id,
              body: `History message ${index}`,
              createdAt: new Date(time + index),
            })),
            {
              authorId: owner.id,
              body: "PRIVATE HISTORY NOTE",
              internal: true,
              createdAt: new Date(time + 106),
            },
          ],
        },
      },
    });
    const latest = (await (await api(user, `/support/${ticket.id}`)).json())
      .ticket;
    expect(latest.messages).toHaveLength(20);
    expect(latest.messages.at(-1).body).toBe("History message 104");
    expect(latest.messageTotal).toBe(105);
    expect(JSON.stringify(latest)).not.toContain("PRIVATE HISTORY NOTE");
    const oldest = (
      await (await api(user, `/support/${ticket.id}?messagesPage=6`)).json()
    ).ticket;
    expect(oldest.messages).toHaveLength(5);
    expect(oldest.messages[0].body).toBe("History message 0");
    const staffView = (
      await (await api(owner, `/admin/support/${ticket.id}`)).json()
    ).ticket;
    expect(staffView.messageTotal).toBe(106);
    expect(staffView.messages.at(-1).body).toBe("PRIVATE HISTORY NOTE");
  });
  it("requires content review, preserves immutable versions and redacts audit reasons", async () => {
    const response = await api(owner, "/admin/content", {
      reason: "Review token=private-fixture-value",
      kind: "template",
      key: catalog[0].path,
      content:
        "# Fixture template\n\nReviewed instructions for this document with acceptance criteria.",
      source: "Repository fixture",
      license: "Original project content",
    });
    expect(response.status).toBe(201);
    const item = await response.json();
    contentIds.push(item.id);
    expect(
      (
        await api(owner, `/admin/content/${item.id}/publish`, {
          reason,
          version: 1,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await api(owner, `/admin/content/${item.id}/review`, {
          reason,
          version: 1,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await api(owner, `/admin/content/${item.id}/publish`, {
          reason,
          version: 1,
        })
      ).status,
    ).toBe(200);
    const record = await db.contentVersion.findUniqueOrThrow({
      where: { id: item.id },
    });
    expect(hash(record.content)).toBe(record.checksum);
    const pinned = await publishedTemplates();
    expect(pinned[catalog[0].path]).toBe(record.content);
    const audit = await db.auditEvent.findFirstOrThrow({
      where: { action: "content.drafted", resourceId: item.id },
    });
    expect(audit.reason).toBe("Review token=[REDACTED]");
    expect(
      (
        await api(owner, `/admin/content/${item.id}/unpublish`, {
          reason,
          version: 1,
        })
      ).status,
    ).toBe(200);
    expect(await readTemplate(catalog[0])).not.toBe(record.content);
    expect(pinned[catalog[0].path]).toBe(record.content);
  });
  it("records private exports and requires evidence before completing a privacy request", async () => {
    const request = await db.dataRequest.create({
      data: { userId: user.id, kind: "export" },
    });
    try {
      expect(
        (
          await api(owner, `/admin/privacy/${request.id}`, {
            reason,
            version: 1,
            status: "completed",
            evidence: "Verified fixture export",
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await api(admin, `/admin/privacy/${request.id}`, {
            reason,
            version: 1,
            status: "processing",
            evidence: "",
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await api(admin, `/admin/privacy/${request.id}`, {
            reason,
            version: 2,
            status: "completed",
            evidence: "Verified fixture export delivered",
          })
        ).status,
      ).toBe(200);
      const from = new Date().toISOString().slice(0, 10),
        to = from;
      const response = await api(
        owner,
        `/admin/reports/export?from=${from}&to=${to}`,
        { reason },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toContain("no-store");
      expect(await response.text()).toContain('"Invoice","Plan"');
      expect(
        await db.auditEvent.count({
          where: { userId: owner.id, action: "report.exported" },
        }),
      ).toBe(1);
    } finally {
      await db.dataRequest.delete({ where: { id: request.id } });
    }
  });
});
