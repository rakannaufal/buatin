import { test, expect, login } from "./fixtures";
import { db } from "../../src/server/db";
import { authenticatorCode } from "../helpers/totp";

test("account MFA, recovery setup, privacy requests and second-factor login work on mobile", async ({
  page,
  testAccount,
}) => {
  await login(page, testAccount);
  await page.goto("/account");
  await page
    .getByLabel("Password akun untuk mengaktifkan dua faktor")
    .fill(testAccount.password);
  const [response] = await Promise.all([
    page.waitForResponse(
      (value) =>
        new URL(value.url()).pathname === "/api/auth/two-factor/enable",
    ),
    page.getByRole("button", { name: "Siapkan dua faktor" }).click(),
  ]);
  expect(response.status()).toBe(200);
  const setup = (await response.json()) as { totpURI: string };
  await expect(
    page.getByAltText("Kode QR pengaturan autentikator Buatin"),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/account-security-desktop.png",
    fullPage: true,
    animations: "disabled",
    maskColor: "#dce2dc",
    mask: [
      page.getByAltText("Kode QR pengaturan autentikator Buatin"),
      page.getByLabel("Kode pemulihan dua faktor", { exact: true }),
    ],
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/account-security-mobile.png",
    fullPage: true,
    animations: "disabled",
    maskColor: "#dce2dc",
    mask: [
      page.getByAltText("Kode QR pengaturan autentikator Buatin"),
      page.getByLabel("Kode pemulihan dua faktor", { exact: true }),
    ],
  });
  await page.getByLabel("Kode pemulihan sudah disimpan dengan aman").check();
  await page
    .getByLabel("Kode autentikator 6 digit", { exact: true })
    .fill(await authenticatorCode(setup.totpURI));
  await page.getByRole("button", { name: "Verifikasi dan aktifkan" }).click();
  await expect(
    page.getByText("Dua faktor aktif. Sesi lain sudah dicabut."),
  ).toBeVisible();
  await page
    .getByLabel("Ketik email akun untuk konfirmasi")
    .fill(testAccount.email);
  await page.getByRole("button", { name: "Kirim permintaan data" }).click();
  await expect(
    page.getByText(/Salinan data: Menunggu pengelola/),
  ).toBeVisible();
  expect(
    (await (await page.request.get("/api/account/sessions")).json())
      .sessions[0],
  ).not.toHaveProperty("token");
  await page.request.post("/api/auth/sign-out", { data: {} });
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(testAccount.email);
  await page.getByLabel("Password", { exact: true }).fill(testAccount.password);
  for (let attempt = 0; attempt < 3; attempt++) {
    const [signedIn] = await Promise.all([
      page.waitForResponse(
        (value) => new URL(value.url()).pathname === "/api/auth/sign-in/email",
      ),
      page
        .getByRole("button", { name: "Masuk ke workspace", exact: true })
        .click(),
    ]);
    if (signedIn.status() !== 429) {
      expect(signedIn.ok()).toBe(true);
      break;
    }
    const seconds = Number(
      signedIn.headers()["retry-after"] ??
        signedIn.headers()["x-retry-after"] ??
        10,
    );
    if (!Number.isFinite(seconds) || seconds > 60)
      throw new Error("Unexpected fixture backoff");
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000 + 100));
  }
  const input = page.getByLabel("Kode autentikator 6 digit", { exact: true });
  await expect(input).toBeFocused();
  expect((await page.request.get("/api/session")).status()).toBe(401);
  await input.fill(await authenticatorCode(setup.totpURI));
  await page.getByRole("button", { name: "Verifikasi dan masuk" }).click();
  await expect(page).toHaveURL(/dashboard/);
});

test("operator sees production priorities and runtime metrics without mobile overflow", async ({
  page,
  testAccount,
}) => {
  await db.user.update({
    where: { id: testAccount.id },
    data: { role: "admin" },
  });
  await login(page, testAccount);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Prioritas peluncuran" }),
  ).toBeVisible();
  await expect(
    page.getByText("Batas estimasi biaya AI", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Request AI nyata hari ini (UTC)", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/operations-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/operations-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});
