import { test, expect } from "./fixtures";

test("Google login offers keyboard access, mobile layout and retryable errors", async ({
  page,
}) => {
  await page.goto("/login");
  const google = page.getByRole("button", { name: "Lanjutkan dengan Google" });
  await expect(google).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Lewati ke formulir" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Email", { exact: true })).toBeFocused();
  for (let index = 0; index < 4; index++) await page.keyboard.press("Tab");
  await expect(google).toBeFocused();
  await page.route("**/api/auth/sign-in/social", async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      provider: "google",
      callbackURL: "/dashboard",
      errorCallbackURL: "/login",
      disableRedirect: true,
    });
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: "{}",
    });
  });
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Login Google belum tersedia",
  );
  await expect(google).toBeEnabled();
  await page.screenshot({
    path: "test-results/google-login-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/google-login-mobile.png",
    fullPage: true,
  });
  await page.goto("/signup");
  await expect(google).toBeVisible();
  const consent = page.locator(".auth-form p").filter({
    hasText: /Dengan (melanjutkan|mendaftar), Anda menyetujui/,
  });
  await expect(consent).toHaveCount(1);
  await expect(
    page.getByText("Mode pengembangan. Email belum dikirim ke internet."),
  ).toHaveCount(0);
  await expect(
    consent.getByRole("link", { name: "ketentuan layanan" }),
  ).toHaveAttribute("href", "/terms");
  await expect(
    consent.getByRole("link", { name: "kebijakan privasi" }),
  ).toHaveAttribute("href", "/privacy");
});

test("authentication keeps email first, Google below, and verification contextual", async ({
  page,
}) => {
  for (const [path, action] of [
    ["/login", "Masuk"],
    ["/signup", "Daftar"],
  ]) {
    await page.goto(path);
    const form = page.locator(".auth-form");
    const primary = form.getByRole("button", { name: action, exact: true });
    const divider = form.locator(".auth-divider");
    const google = form.getByRole("button", {
      name: "Lanjutkan dengan Google",
    });
    await expect(primary).toBeVisible();
    await expect(divider).toHaveText("atau");
    await expect(google).toBeVisible();
    await expect(
      form.getByRole("link", { name: /Kirim ulang verifikasi/ }),
    ).toHaveCount(0);
    const primaryBounds = (await primary.boundingBox())!;
    const dividerBounds = (await divider.boundingBox())!;
    const googleBounds = (await google.boundingBox())!;
    expect(dividerBounds.y).toBeGreaterThanOrEqual(
      primaryBounds.y + primaryBounds.height,
    );
    expect(googleBounds.y).toBeGreaterThanOrEqual(
      dividerBounds.y + dividerBounds.height,
    );
  }
  await page.goto("/login");
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "EMAIL_NOT_VERIFIED" }),
    }),
  );
  await page
    .getByLabel("Email", { exact: true })
    .fill("unverified@localhost.test");
  await page.getByLabel("Password", { exact: true }).fill("test-only-password");
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Verifikasi email Anda sebelum masuk.",
  );
  await expect(
    page.getByRole("link", { name: "Kirim ulang verifikasi", exact: true }),
  ).toHaveAttribute("href", "/verify-email");
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ code: "account_unavailable" }),
    }),
  );
  await page.getByRole("button", { name: "Masuk", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "akses sementara dibatasi",
  );
  await expect(
    page.getByRole("link", { name: /Kirim ulang verifikasi/ }),
  ).toHaveCount(0);
});

test("OAuth callback errors use safe, actionable messages", async ({
  page,
}) => {
  await page.goto(
    "/login?error=credential_login_required&error_description=untrusted-provider-text",
  );
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "autentikator",
  );
  await expect(page.getByText("untrusted-provider-text")).toHaveCount(0);
  await page.goto("/login?error=access_denied");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "dibatalkan",
  );
});

test("Google login rejects unexpected redirect destinations and allows retry", async ({
  page,
}) => {
  await page.goto("/login");
  const google = page.getByRole("button", { name: "Lanjutkan dengan Google" });
  await page.route("**/api/auth/sign-in/social", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://accounts.google.com.untrusted.example/o/oauth2/v2/auth",
      }),
    });
  });
  await google.click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Tidak dapat membuka Google",
  );
  await expect(page).toHaveURL(/\/login$/);
  await expect(google).toBeEnabled();
  await page.route("**/api/auth/sign-in/social", async (route) => {
    await route.abort("failed");
  });
  await google.click();
  await expect(google).toBeEnabled();
  await expect(page).toHaveURL(/\/login$/);
});
