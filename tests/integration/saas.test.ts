import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { db, json } from "../../src/server/db";
import { createAuth, auth } from "../../src/server/auth";
import {
  entitlementFor,
  requireFeature,
  reserveQuota,
  refundQuota,
  reservePlanner,
} from "../../src/server/entitlements";
import { userLock } from "../../src/server/limits";
import {
  checkout,
  receiveCallback,
  reconcilePayment,
} from "../../src/server/billing";
import { signDuitku } from "../../src/server/duitku";
import { weekPeriod, addBillingMonth } from "../../src/domain/billing";
import { grantTestPlan, clearTestBilling } from "../helpers/saas";
import { maintenance } from "../../src/worker/maintenance";
import { cancelJob, startBatch } from "../../src/server/projects";
import { defaultPlanner, resolvePlan } from "../../src/domain/planner";
const users: { id: string; name: string; email: string }[] = [];
async function account() {
  const password = `Fixture-${crypto.randomUUID()}`;
  const result = await createAuth(true).api.signUpEmail({
    body: {
      name: "SaaS fixture",
      email: `saas-${crypto.randomUUID()}@localhost.test`,
      password,
    },
  });
  users.push(result.user);
  await db.user.update({
    where: { id: result.user.id },
    data: { emailVerified: true },
  });
  return { ...result.user, password };
}
async function jobForTest(userId: string) {
  const project = await db.project.create({
    data: {
      userId,
      webType: "landing",
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
      status: "failed",
      total: 1,
      snapshot: {},
      finishedAt: new Date(),
    },
  });
}
beforeAll(() => {
  if (
    process.env.MOCK_LLM !== "true" ||
    !["localhost", "127.0.0.1"].includes(
      new URL(process.env.DATABASE_URL!).hostname,
    )
  )
    throw new Error("SaaS tests require local mock database");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
afterAll(async () => {
  for (const user of users) {
    await db.emailMessage.deleteMany({ where: { to: user.email } });
    await clearTestBilling(user.id);
    await db.idempotencyKey.deleteMany({ where: { userId: user.id } });
    await db.auditEvent.deleteMany({ where: { userId: user.id } });
    await db.job.deleteMany({ where: { userId: user.id } });
    await db.plan.deleteMany({ where: { project: { userId: user.id } } });
    await db.user.delete({ where: { id: user.id } });
  }
  await db.$disconnect();
});
describe("SaaS entitlements and durable quotas", () => {
  it("bounds free planning attempts without consuming the lifetime generation grant", async () => {
    const user = await account();
    const plan = () =>
      db.$transaction(async (tx) => {
        await userLock(tx, user.id);
        return reservePlanner(tx, user.id);
      });
    for (let index = 0; index < 5; index++) await plan();
    await expect(plan()).rejects.toMatchObject({ code: "PLANNER_QUOTA" });
    expect(await entitlementFor(user.id)).toMatchObject({
      remaining: 1,
      plannerUsed: 5,
    });
  });
  it("rolls back an entire batch when its selection exceeds remaining quota", async () => {
    const user = await account();
    await grantTestPlan(user.id, "max");
    const period = weekPeriod();
    await db.usagePeriod.create({
      data: { userId: user.id, ...period, jobsCount: 24 },
    });
    const brief =
      "Landing page publik untuk studio desain, layanan, portofolio dan kontak WhatsApp. Tanpa login atau pembayaran.";
    const resolved = resolvePlan(
      defaultPlanner("landing", brief),
      brief,
      "landing",
    );
    const items: { projectId: string; planVersion: number }[] = [];
    for (let index = 0; index < 2; index++) {
      const project = await db.project.create({
        data: {
          userId: user.id,
          webType: "landing",
          brief,
          status: "plan_ready",
          expiresAt: new Date(Date.now() + 86400000),
          plans: {
            create: {
              version: 1,
              briefVersion: 1,
              data: json(resolved),
              snapshot: {},
            },
          },
        },
      });
      items.push({ projectId: project.id, planVersion: 1 });
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          data: [{ id: "mock-planner" }, { id: "mock-writer" }],
        }),
      ),
    );
    await expect(
      startBatch(user.id, items, "batch-over-quota"),
    ).rejects.toMatchObject({ code: "QUOTA_EXHAUSTED" });
    expect(await db.job.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.quotaLedger.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.idempotencyKey.count({ where: { userId: user.id } })).toBe(
      0,
    );
    expect(await entitlementFor(user.id)).toMatchObject({
      used: 24,
      remaining: 1,
    });
  });
  it("revalidates stale cleanup candidates before deleting refreshed drafts or new results", async () => {
    const user = await account();
    const past = new Date(Date.now() - 15 * 86400000);
    const candidates = [];
    for (let index = 0; index < 2; index++) {
      const project = await db.project.create({
        data: {
          userId: user.id,
          webType: "landing",
          status: "draft",
          expiresAt: past,
          updatedAt: past,
        },
        include: {
          jobs: { select: { id: true } },
          tasks: { select: { id: true } },
        },
      });
      candidates.push(project);
    }
    await db.project.update({
      where: { id: candidates[0].id },
      data: {
        brief: "A newly edited draft",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const plan = await db.plan.create({
      data: {
        projectId: candidates[1].id,
        version: 1,
        briefVersion: 1,
        data: {},
        snapshot: {},
      },
    });
    const job = await db.job.create({
      data: {
        userId: user.id,
        projectId: candidates[1].id,
        planId: plan.id,
        status: "succeeded",
        total: 1,
        snapshot: {},
        finishedAt: new Date(),
      },
    });
    vi.spyOn(db.project, "findMany").mockResolvedValueOnce(candidates);
    await maintenance();
    expect(
      await db.project.count({
        where: { id: { in: candidates.map((project) => project.id) } },
      }),
    ).toBe(2);
    expect(await db.job.count({ where: { id: job.id } })).toBe(1);
  });
  it("public signup requires actual email verification and a reset token is single-use", async () => {
    const email = `saas-${crypto.randomUUID()}@localhost.test`,
      password = `Fixture-${crypto.randomUUID()}`;
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: "Public account",
        callbackURL: `${process.env.APP_URL}/login`,
      },
    });
    users.push(result.user);
    expect(result.user.emailVerified).toBe(false);
    expect(result.token).toBeNull();
    await expect(
      auth.api.signInEmail({ body: { email, password } }),
    ).rejects.toMatchObject({ status: "FORBIDDEN" });
    const verification = await db.emailMessage.findFirstOrThrow({
      where: { to: email },
      orderBy: { createdAt: "desc" },
    });
    const url = new URL(verification.text.match(/https?:\/\/\S+/)![0]);
    await auth.api.verifyEmail({
      query: { token: url.searchParams.get("token")! },
    });
    expect(
      (await db.user.findUniqueOrThrow({ where: { email } })).emailVerified,
    ).toBe(true);
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: `${process.env.APP_URL}/reset-password` },
    });
    const reset = await db.emailMessage.findFirstOrThrow({
      where: { to: email, subject: "Atur ulang password Bantuin" },
    });
    const resetUrl = new URL(reset.text.match(/https?:\/\/\S+/)![0]);
    const token = resetUrl.pathname.split("/").at(-1)!;
    const newPassword = `Changed-${crypto.randomUUID()}`;
    await auth.api.resetPassword({ body: { token, newPassword } });
    await expect(
      auth.api.resetPassword({ body: { token, newPassword } }),
    ).rejects.toBeDefined();
    await expect(
      auth.api.signInEmail({ body: { email, password } }),
    ).rejects.toBeDefined();
    expect(
      (await auth.api.signInEmail({ body: { email, password: newPassword } }))
        .user.email,
    ).toBe(email);
  });
  it("reserves only one lifetime grant under concurrent requests; deleting results cannot replenish it", async () => {
    const user = await account();
    const jobs = await Promise.all([jobForTest(user.id), jobForTest(user.id)]);
    const reservations = await Promise.allSettled(
      jobs.map((job) =>
        db.$transaction(async (tx) => {
          await userLock(tx, user.id);
          const entitlement = await entitlementFor(user.id, tx);
          await reserveQuota(tx, user.id, job.id, entitlement);
        }),
      ),
    );
    expect(
      reservations.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect((await entitlementFor(user.id)).remaining).toBe(0);
    await db.job.deleteMany({ where: { userId: user.id } });
    await db.plan.deleteMany({ where: { project: { userId: user.id } } });
    await db.project.deleteMany({ where: { userId: user.id } });
    expect((await entitlementFor(user.id)).remaining).toBe(0);
    expect(await db.quotaLedger.count({ where: { userId: user.id } })).toBe(1);
  });
  it("refunds a pre-AI cancellation when a crashed worker lease expires", async () => {
    const user = await account(),
      job = await jobForTest(user.id);
    await db.$transaction(async (tx) => {
      await userLock(tx, user.id);
      await reserveQuota(
        tx,
        user.id,
        job.id,
        await entitlementFor(user.id, tx),
      );
      await tx.job.update({
        where: { id: job.id },
        data: {
          status: "cancel_requested",
          cancelRequestedAt: new Date(),
          leaseOwner: "crashed-fixture",
          leaseExpiresAt: new Date(Date.now() - 1000),
        },
      });
    });
    await maintenance();
    await maintenance();
    expect(await entitlementFor(user.id)).toMatchObject({
      remaining: 1,
      used: 0,
    });
    expect(
      await db.quotaLedger.count({
        where: { jobId: job.id, action: "refund" },
      }),
    ).toBe(1);
    expect(
      (await db.job.findUniqueOrThrow({ where: { id: job.id } })).status,
    ).toBe("cancelled");
  });
  it.each(["queued", "cancel_requested"])(
    "does not refund template output on %s cancellation even with zero AI requests",
    async (status) => {
      const user = await account(),
        job = await jobForTest(user.id);
      await db.$transaction(async (tx) => {
        await userLock(tx, user.id);
        await reserveQuota(
          tx,
          user.id,
          job.id,
          await entitlementFor(user.id, tx),
        );
        await tx.jobFile.create({
          data: {
            jobId: job.id,
            fileId: "brief",
            status: "succeeded",
            content: "# Existing checkpoint",
          },
        });
        await tx.job.update({
          where: { id: job.id },
          data: {
            status,
            llmRequestCount: 0,
            cancelRequestedAt:
              status === "cancel_requested" ? new Date() : null,
            leaseExpiresAt: new Date(Date.now() - 1000),
          },
        });
      });
      if (status === "queued") await cancelJob(user.id, job.id);
      else await maintenance();
      expect((await entitlementFor(user.id)).remaining).toBe(0);
      expect(
        await db.quotaLedger.count({
          where: { jobId: job.id, action: "refund" },
        }),
      ).toBe(0);
      expect(
        (await db.job.findUniqueOrThrow({ where: { id: job.id } })).status,
      ).toBe("cancelled");
    },
  );
  it("refunds once, to the original period rather than the new week", async () => {
    const user = await account(),
      subscription = await grantTestPlan(user.id, "plus"),
      job = await jobForTest(user.id);
    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        startsAt: new Date("2026-10-01T00:00:00Z"),
        endsAt: new Date("2026-12-01T00:00:00Z"),
      },
    });
    const previous = await entitlementFor(
      user.id,
      db,
      new Date("2026-10-18T00:00:00Z"),
    );
    await db.$transaction(async (tx) => {
      await userLock(tx, user.id);
      await reserveQuota(tx, user.id, job.id, previous);
    });
    await Promise.all(
      [1, 2].map(() =>
        db.$transaction(async (tx) => {
          await userLock(tx, user.id);
          await refundQuota(tx, user.id, job.id, "test_failure");
        }),
      ),
    );
    expect(
      (
        await db.usagePeriod.findUniqueOrThrow({
          where: { userId_key: { userId: user.id, key: previous.periodKey } },
        })
      ).jobsCount,
    ).toBe(0);
    expect(
      await db.quotaLedger.count({
        where: { userId: user.id, action: "refund" },
      }),
    ).toBe(1);
    expect(
      (await entitlementFor(user.id, db, new Date("2026-10-26T00:00:00Z")))
        .used,
    ).toBe(0);
  });
  it("returns to the original free allowance at expiry; week reset does not roll over", async () => {
    const user = await account(),
      subscription = await grantTestPlan(user.id, "starter");
    await db.subscription.update({
      where: { id: subscription.id },
      data: {
        startsAt: new Date("2026-10-01T00:00:00Z"),
        endsAt: new Date("2026-11-01T00:00:00Z"),
      },
    });
    const period = weekPeriod(new Date("2026-10-25T16:59:59Z"));
    await db.usagePeriod.create({
      data: { userId: user.id, ...period, key: period.key, jobsCount: 3 },
    });
    const before = await entitlementFor(
      user.id,
      db,
      new Date("2026-10-25T16:59:59Z"),
    );
    const after = await entitlementFor(
      user.id,
      db,
      new Date("2026-10-25T17:00:00Z"),
    );
    expect(before.remaining).toBe(0);
    expect(after.remaining).toBe(3);
    const expired = await entitlementFor(
      user.id,
      db,
      new Date("2026-11-01T00:00:00Z"),
    );
    expect(expired.planId).toBe("free");
    expect(expired.remaining).toBe(1);
    await expect(requireFeature(user.id, "templates")).rejects.toMatchObject({
      code: "PLAN_REQUIRED",
    });
  });
});
describe("Duitku QRIS billing", () => {
  function configure() {
    vi.stubEnv("DUITKU_API_KEY", "fixture-merchant-key");
    vi.stubEnv("DUITKU_MERCHANT_CODE", "DFIXTURE");
  }
  it("keeps checkout disabled without merchant credentials or approved prices", async () => {
    const user = await account();
    vi.stubEnv("DUITKU_API_KEY", "");
    await expect(
      checkout(user, "plus", "no-credentials-key"),
    ).rejects.toMatchObject({ code: "PAYMENT_UNAVAILABLE" });
    expect(await db.payment.count({ where: { userId: user.id } })).toBe(0);
  });
  it("rejects non-QRIS methods, altered totals and signatures without changing a subscription", async () => {
    configure();
    const user = await account();
    const payment = await db.payment.create({
      data: {
        id: `test-${crypto.randomUUID()}`,
        userId: user.id,
        planId: "plus",
        planName: "Pro Plus",
        amount: 10000,
        subtotal: 10000,
        weeklyQuota: 10,
        retentionDays: 90,
        priority: 10,
        method: "NQ",
        reference: `ref-${crypto.randomUUID()}`,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const input = {
      merchantCode: "DFIXTURE",
      merchantOrderId: payment.id,
      amount: "10000",
      reference: payment.reference!,
      paymentCode: "NQ",
      resultCode: "00",
      signature: signDuitku(
        `DFIXTURE10000${payment.id}`,
        "fixture-merchant-key",
      ),
    };
    await expect(
      receiveCallback({ ...input, paymentCode: "VA" }),
    ).rejects.toBeDefined();
    await expect(
      receiveCallback({ ...input, amount: "20000" }),
    ).rejects.toMatchObject({ code: "INVALID_SIGNATURE" });
    await expect(
      receiveCallback({ ...input, reference: "wrong" }),
    ).rejects.toMatchObject({ code: "PAYMENT_MISMATCH" });
    expect(await db.subscription.count({ where: { userId: user.id } })).toBe(0);
  });
  it("creates only the configured QRIS inquiry and reuses the same invoice for duplicate checkout", async () => {
    configure();
    const user = await account();
    const original = await db.billingPlan.findUniqueOrThrow({
      where: { id: "plus" },
    });
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, options: RequestInit) => {
        const body = JSON.parse(String(options.body)) as Record<
          string,
          unknown
        >;
        calls.push({ url, body });
        return url.endsWith("getpaymentmethod")
          ? Response.json({
              responseCode: "00",
              paymentFee: [{ paymentMethod: "VA" }, { paymentMethod: "NQ" }],
            })
          : Response.json({
              statusCode: "00",
              reference: `ref-${user.id}`,
              amount: "12345",
              qrString: "QRIS fixture",
            });
      }),
    );
    try {
      await db.billingPlan.update({
        where: { id: "plus" },
        data: { available: true, monthlyPrice: 12345 },
      });
      const orders = await Promise.all([
        checkout(user, "plus", "same-invoice-key"),
        checkout(user, "plus", "same-invoice-key"),
      ]);
      expect(orders[0].id).toBe(orders[1].id);
      expect(await db.payment.count({ where: { userId: user.id } })).toBe(1);
      expect(calls).toHaveLength(2);
      expect(calls[1].body.paymentMethod).toBe("NQ");
      expect(calls[1].body.paymentAmount).toBe(12345);
      expect(calls[1].body.signature).toBe(
        signDuitku(`DFIXTURE${orders[0].id}12345`, "fixture-merchant-key"),
      );
      const row = await db.payment.findUniqueOrThrow({
        where: { id: orders[0].id },
      });
      expect(row.status).toBe("pending");
      expect(row.weeklyQuota).toBe(10);
      expect((await checkout(user, "plus", "second-click-key")).id).toBe(
        row.id,
      );
      expect(calls).toHaveLength(2);
    } finally {
      await db.billingPlan.update({
        where: { id: "plus" },
        data: {
          available: original.available,
          monthlyPrice: original.monthlyPrice,
        },
      });
    }
  });
  it("durably records duplicate and late callbacks; activates once after provider verification, preserving weekly use", async () => {
    configure();
    const user = await account(),
      original = await grantTestPlan(user.id, "starter");
    const period = weekPeriod();
    await db.usagePeriod.create({
      data: {
        userId: user.id,
        key: period.key,
        startsAt: period.startsAt,
        endsAt: period.endsAt,
        jobsCount: 2,
      },
    });
    const payment = await db.payment.create({
      data: {
        id: `test-${crypto.randomUUID()}`,
        userId: user.id,
        planId: "plus",
        planName: "Pro Plus",
        amount: 10000,
        subtotal: 10000,
        weeklyQuota: 10,
        retentionDays: 90,
        priority: 10,
        method: "NQ",
        status: "pending",
        checks: 12,
        lastCheckedAt: new Date(),
        reference: `ref-${crypto.randomUUID()}`,
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    const callback = {
      merchantCode: "DFIXTURE",
      merchantOrderId: payment.id,
      amount: "10000",
      reference: payment.reference!,
      paymentCode: "NQ",
      resultCode: "00",
      signature: signDuitku(
        `DFIXTURE10000${payment.id}`,
        "fixture-merchant-key",
      ),
    };
    await Promise.all([receiveCallback(callback), receiveCallback(callback)]);
    expect(
      await db.webhookEvent.count({ where: { paymentId: payment.id } }),
    ).toBe(1);
    expect(
      (await db.payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .status,
    ).toBe("pending");
    const provider = vi.fn(async () =>
      Response.json({
        merchantOrderId: payment.id,
        reference: payment.reference,
        amount: "10000",
        statusCode: "00",
      }),
    );
    vi.stubGlobal("fetch", provider);
    await Promise.all([
      reconcilePayment(payment.id),
      reconcilePayment(payment.id),
    ]);
    expect(provider).toHaveBeenCalledTimes(1);
    const renewed = await db.subscription.findUniqueOrThrow({
      where: { paymentId: payment.id },
    });
    expect(renewed.startsAt).toEqual(original.endsAt);
    expect(renewed.endsAt).toEqual(addBillingMonth(original.endsAt));
    expect(renewed.planId).toBe("plus");
    expect((await entitlementFor(user.id)).planId).toBe("starter");
    expect((await entitlementFor(user.id)).used).toBe(2);
    await receiveCallback({ ...callback, resultCode: "01" });
    await reconcilePayment(payment.id);
    expect(
      (await db.payment.findUniqueOrThrow({ where: { id: payment.id } }))
        .status,
    ).toBe("paid");
    expect(
      await db.subscription.count({ where: { paymentId: payment.id } }),
    ).toBe(1);
  });
});
