import { test, expect, login, removeAccount } from "./fixtures";
import { grantTestPlan } from "../helpers/saas";
import { db } from "../../src/server/db";
import { Prisma } from "@prisma/client";
const brief =
  "Landing page untuk studio desain UMKM, layanan desain, portofolio, proses kerja, dan kontak WhatsApp. Tanpa login atau pembayaran. Prioritas mobile, warna hijau dan tipografi yang mudah dibaca.";
test("public registration, email verification and login", async ({
  page,
  baseURL,
}) => {
  const email = `e2e-${crypto.randomUUID()}@localhost.test`,
    password = `Fixture-${crypto.randomUUID()}`;
  try {
    await page.goto("/signup");
    await page.getByLabel("Nama", { exact: true }).fill("Public E2E account");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Buat akun gratis", exact: true })
      .click();
    await expect(page.getByText(/tautan sudah disiapkan/)).toBeVisible();
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    expect(user.emailVerified).toBe(false);
    expect(user.role).toBe("user");
    const mail = await db.emailMessage.findFirstOrThrow({
      where: { to: email, subject: "Verifikasi email Buatin" },
    });
    const link = mail.text.match(/https?:\/\/\S+/)![0];
    await page.goto(link);
    await expect(page).toHaveURL(/login/);
    await login(page, { id: user.id, email, password });
    const entitlement = await (await page.request.get("/api/account")).json();
    expect(entitlement.entitlement.remaining).toBe(1);
  } finally {
    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      await db.emailMessage.deleteMany({ where: { to: email } });
      await removeAccount(
        { id: user.id, email, password },
        page.request,
        baseURL!,
      );
    }
  }
});
test("public landing, pricing, registration, privacy stay readable on mobile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-landing.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/",
    "/pricing",
    "/signup",
    "/privacy",
    "/terms",
    "/forgot-password",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/pricing");
  await expect(
    page.getByRole("columnheader", { name: /Pro Max/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-pricing.png",
    fullPage: true,
  });
  const comparison = page.getByRole("region", {
    name: "Perbandingan paket Buatin",
    exact: true,
  });
  await comparison.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => comparison.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0);
});
test("ordinary Free account cannot access admin, presets, templates, or batch", async ({
  page,
  testAccount,
}) => {
  await login(page, testAccount);
  for (const path of [
    "/api/admin",
    "/api/settings",
    "/api/presets",
    "/api/templates",
    "/api/batch-ready",
  ]) {
    expect((await page.request.get(path)).status()).toBe(403);
  }
  const account = await page.request.get("/api/account");
  expect((await account.json()).entitlement).toMatchObject({
    planId: "free",
    remaining: 1,
    resetsAt: null,
  });
  await page.goto("/admin");
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/billing");
  await expect(
    page.getByRole("heading", { name: "Paket & tagihan." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Belum dijual" })).toHaveCount(
    3,
  );
  await page.screenshot({
    path: "test-results/desktop-billing.png",
    fullPage: true,
  });
});
test("Plus presets, brief revisions, selective regeneration and comparison run end to end", async ({
  page,
  testAccount,
}) => {
  await grantTestPlan(testAccount.id, "plus");
  await login(page, testAccount);
  const headers = { Origin: new URL(page.url()).origin };
  const preset = await page.request.post("/api/presets", {
    headers,
    data: { name: "Pola studio Plus", webType: "landing", brief },
  });
  expect(preset.status()).toBe(201);
  await page.goto("/library");
  await expect(
    page.getByText("Pola studio Plus", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Gunakan preset" }).click();
  await expect(page.getByLabel("Nama proyek")).toHaveValue("Pola studio Plus");
  await page.getByRole("button", { name: "Simpan draft", exact: true }).click();
  await expect(page).toHaveURL(/projects\/[a-f0-9-]+$/);
  const projectId = page.url().split("/").at(-1)!;
  await page
    .getByLabel("Brief proyek", { exact: true })
    .fill(`${brief}\nSertakan tombol konsultasi di halaman layanan.`);
  await expect(
    page.getByRole("status").filter({ hasText: "Tersimpan" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Buat rencana dokumen" }).click();
  await expect(
    page.getByRole("heading", { name: "Dokumen terpilih" }),
  ).toBeVisible({ timeout: 45000 });
  const revisions = await page.request.get(
    `/api/projects/${projectId}/revisions`,
  );
  expect((await revisions.json()).revisions.length).toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Mulai generasi", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Konfirmasi dan mulai", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Dokumen siap ditinjau.", exact: true }),
  ).toBeVisible({ timeout: 90000 });
  const jobId = page.url().split("/").at(-1)!;
  await page.getByRole("link", { name: "Lihat hasil", exact: true }).click();
  await page
    .getByText("Fitur Pro: regenerasi & perbandingan", { exact: true })
    .click();
  const state = await (await page.request.get(`/api/jobs/${jobId}`)).json();
  expect(state.job.status).toBe("succeeded");
  expect(
    (
      await page.request.put(`/api/jobs/${jobId}/regenerate`, {
        headers,
        data: { fileIds: ["outside-catalog"] },
      })
    ).status(),
  ).toBe(400);
  const target = state.job.files.at(-1);
  await page
    .locator(".regeneration-files")
    .getByText(target.path, { exact: true })
    .click();
  await expect(page.getByText(/Dokumen yang akan dibuat ulang:/)).toBeVisible();
  await page
    .getByRole("button", { name: "Konfirmasi regenerasi, gunakan 1 kuota" })
    .click();
  await expect(page).toHaveURL(/\/jobs\/[a-f0-9-]+$/);
  const regeneratedId = page.url().split("/").at(-1)!;
  expect(regeneratedId).not.toBe(jobId);
  await expect(
    page.getByRole("heading", { name: "Dokumen siap ditinjau.", exact: true }),
  ).toBeVisible({ timeout: 90000 });
  const original = await db.jobFile.findMany({ where: { jobId } });
  const regenerated = await db.job.findUniqueOrThrow({
    where: { id: regeneratedId },
    include: { files: true },
  });
  const unchanged = regenerated.files.filter((file) => file.attempts === 0);
  expect(unchanged.length).toBeGreaterThan(0);
  for (const file of unchanged)
    expect(file.checksum).toBe(
      original.find((item) => item.fileId === file.fileId)?.checksum,
    );
  await page.getByRole("link", { name: "Lihat hasil", exact: true }).click();
  await page
    .getByText("Fitur Pro: regenerasi & perbandingan", { exact: true })
    .click();
  await page.getByLabel("Versi sebelumnya").selectOption(jobId);
  await expect(page.locator(".comparison-columns pre").first()).toContainText(
    "MODE MOCK",
  );
  const account = await (await page.request.get("/api/account")).json();
  expect(account.entitlement).toMatchObject({
    planId: "plus",
    used: 2,
    remaining: 8,
  });
  expect((await page.request.get("/api/templates")).status()).toBe(403);
});
test("Max private templates and atomic batch respect one executing job per account", async ({
  page,
  testAccount,
}) => {
  await grantTestPlan(testAccount.id, "max");
  await login(page, testAccount);
  const headers = { Origin: new URL(page.url()).origin };
  await page.goto("/library");
  await page.getByLabel("Dokumen", { exact: true }).selectOption("prd");
  await page
    .getByLabel("Isi template")
    .fill(
      "# Private PRD fixture\n\n## Tujuan\n[Isi sesuai brief]\n\n## Kriteria penerimaan\n[Isi]",
    );
  await page
    .getByRole("button", { name: "Simpan template", exact: true })
    .click();
  await expect(
    page.getByLabel("Dokumen", { exact: true }).locator("option:checked"),
  ).toHaveText(/pribadi/);
  const items: { projectId: string; planVersion: number }[] = [];
  for (const name of ["Batch pertama", "Batch kedua"]) {
    const response = await page.request.post("/api/projects", {
      headers,
      data: { name, webType: "landing", brief },
    });
    const { project } = await response.json();
    expect(
      (
        await page.request.post(`/api/projects/${project.id}/plans`, {
          headers,
          data: { briefVersion: 1 },
        })
      ).status(),
    ).toBe(202);
    await expect
      .poll(
        async () =>
          (await (await page.request.get(`/api/projects/${project.id}`)).json())
            .project.status,
        { timeout: 45000 },
      )
      .toBe("plan_ready");
    items.push({ projectId: project.id, planVersion: 1 });
  }
  await page.goto("/dashboard");
  await page
    .getByText("Antrekan beberapa proyek, Pro Max", { exact: true })
    .click();
  for (const label of ["Batch pertama", "Batch kedua"])
    await page.getByRole("checkbox", { name: label, exact: true }).check();
  await page.getByRole("button", { name: "Antrekan 2 proyek" }).click();
  await expect(
    page.getByText("Proyek sudah diantrekan.", { exact: false }),
  ).toBeVisible();
  const jobs = await db.job.findMany({
    where: { userId: testAccount.id },
    orderBy: { createdAt: "asc" },
  });
  expect(jobs).toHaveLength(2);
  for (const job of jobs)
    expect(
      (job.snapshot as { templates: { prd: string } }).templates.prd,
    ).toContain("Private PRD fixture");
  const retry = await page.request.post("/api/batch", {
    headers: { ...headers, "Idempotency-Key": "quota-batch-retry" },
    data: { items },
  });
  expect(retry.status()).toBe(409);
  await expect
    .poll(
      async () => {
        const active = await db.job.count({
          where: {
            userId: testAccount.id,
            status: { in: ["running", "validating", "cancel_requested"] },
          },
        });
        expect(active).toBeLessThanOrEqual(1);
        return db.job.count({
          where: { userId: testAccount.id, status: "succeeded" },
        });
      },
      { timeout: 90000 },
    )
    .toBe(2);
  const account = await (await page.request.get("/api/account")).json();
  expect(account.entitlement).toMatchObject({ used: 2, remaining: 23 });
});
test("QRIS fixture renders a private mobile invoice; anonymous access is denied", async ({
  page,
  testAccount,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, testAccount);
  const payment = await db.payment.create({
    data: {
      id: `qris-fixture-${crypto.randomUUID()}`,
      userId: testAccount.id,
      planId: "starter",
      planName: "QRIS fixture",
      amount: 10000,
      subtotal: 10000,
      weeklyQuota: 3,
      retentionDays: 30,
      priority: 0,
      method: "NQ",
      status: "pending",
      qrString: "QRIS SANDBOX TEST FIXTURE - NOT A PAYABLE CODE",
      expiresAt: new Date(Date.now() + 15 * 60000),
    },
  });
  await page.goto(`/billing/${payment.id}`);
  await expect(
    page.getByRole("img", { name: `QRIS tagihan ${payment.id}` }),
  ).toBeVisible();
  await expect(
    page.getByText("Menunggu pembayaran", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("QRIS sandbox untuk pengujian.")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/mobile-qris.png",
    fullPage: true,
    animations: "disabled",
  });
  const anonymous = await page.request.get(`/api/billing/${payment.id}`, {
    headers: { Cookie: "" },
  });
  expect(anonymous.status()).toBe(401);
});
test("admin price changes preserve already purchased benefits", async ({
  page,
  testAccount,
}) => {
  await db.user.update({
    where: { id: testAccount.id },
    data: { role: "admin" },
  });
  await grantTestPlan(testAccount.id, "plus");
  const original = await db.billingPlan.findUniqueOrThrow({
    where: { id: "plus" },
  });
  try {
    await login(page, testAccount);
    await page.goto("/admin/plans");
    await page
      .getByLabel("Password verifikasi admin")
      .fill(testAccount.password);
    await page
      .getByRole("button", { name: "Verifikasi akses", exact: true })
      .click();
    await expect(
      page.getByText("Perubahan admin terbuka sementara", { exact: true }),
    ).toBeVisible();
    const panel = page
      .locator(".admin-plan")
      .filter({ has: page.getByRole("heading", { name: /Pro Plus/ }) });
    await panel.getByText("Susun perubahan Pro Plus", { exact: true }).click();
    const draft = panel.locator(".admin-action-form").first();
    await draft.getByLabel("Harga bulanan IDR").fill("12345");
    await draft.getByLabel("Generasi per minggu").fill("11");
    await draft
      .getByLabel("Alasan perubahan")
      .fill("Reviewed E2E pricing change");
    await draft
      .getByRole("button", { name: "Simpan draft Pro Plus", exact: true })
      .click();
    const version = panel
      .locator(".admin-version")
      .filter({ hasText: "draft" })
      .first();
    await version.locator("summary").click();
    await version
      .getByLabel("Alasan perubahan")
      .fill("Publish reviewed E2E package version");
    await version.getByRole("checkbox").check();
    await version.getByRole("button", { name: /Publish versi/ }).click();
    await expect
      .poll(async () => {
        const plan = await db.billingPlan.findUniqueOrThrow({
          where: { id: "plus" },
        });
        return {
          monthlyPrice: plan.monthlyPrice,
          weeklyQuota: plan.weeklyQuota,
          available: plan.available,
        };
      })
      .toEqual({ monthlyPrice: 12345, weeklyQuota: 11, available: false });
    const { entitlement } = await (
      await page.request.get("/api/account")
    ).json();
    expect(entitlement).toMatchObject({
      planId: "plus",
      limit: 10,
      retentionDays: 90,
    });
  } finally {
    await db.billingPlanVersion.deleteMany({
      where: { createdBy: testAccount.id },
    });
    await db.billingPlan.update({
      where: { id: "plus" },
      data: {
        monthlyPrice: original.monthlyPrice,
        weeklyQuota: original.weeklyQuota,
        retentionDays: original.retentionDays,
        available: original.available,
        version: original.version,
        features:
          original.features === null ? Prisma.DbNull : original.features,
        plannerLimit: original.plannerLimit,
      },
    });
  }
});
