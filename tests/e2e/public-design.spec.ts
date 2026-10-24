import { test, expect, login } from "./fixtures";

test.beforeEach(async ({ baseURL, request }) => {
  if (
    !baseURL ||
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)
  )
    throw new Error("Public design tests require a loopback application.");
  const configuration = await request.get("/api/public-config");
  expect((await configuration.json()).mock).toBe(true);
});

test("mobile navigation supports keyboard dismissal and page selection", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  const navigation = page.getByRole("navigation", { name: "Navigasi publik" });
  await expect(navigation).toBeHidden();
  await menu.focus();
  await menu.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(navigation.getByRole("link", { name: "Paket" })).toBeVisible();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(menu).toBeFocused();

  await menu.press("Enter");
  await navigation.getByRole("link", { name: "FAQ", exact: true }).click();
  await expect(page).toHaveURL(/\/faq$/);
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await expect(
    navigation.getByRole("link", { name: "FAQ", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("FAQ answers open with the keyboard and section links reach their content", async ({
  page,
}) => {
  await page.goto("/faq");
  const question = page.locator("summary").filter({
    hasText: "Apakah Bantuin langsung membuat website?",
  });
  const answer = page.getByText(
    "Bantuin membuat dokumen perencanaan website dalam format Markdown, bukan website yang sudah berjalan.",
    { exact: false },
  );
  await expect(answer).toBeHidden();
  await question.focus();
  await question.press("Enter");
  await expect(answer).toBeVisible();
  await question.press("Space");
  await expect(answer).toBeHidden();

  await page
    .getByRole("navigation", { name: "Isi halaman" })
    .getByRole("link", { name: "Pembayaran dan paket", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pembayaran dan paket", exact: true }),
  ).toBeInViewport();
});

test("the authentication skip link moves keyboard focus to the form panel", async ({
  page,
}) => {
  await page.goto("/signup");
  const skip = page.getByRole("link", { name: "Lewati ke formulir" });
  await skip.focus();
  await skip.press("Enter");
  await expect(page.locator("#auth-content")).toBeFocused();
  await page.keyboard.press("Tab");
  expect(
    await page
      .locator("#auth-content")
      .evaluate((panel) => panel.contains(document.activeElement)),
  ).toBe(true);
});

test("pricing keeps loading visible, reports failures, and retries without navigation", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/pricing");
  expect(response.ok()).toBe(true);
  const pricing = await response.json();
  let fail = true;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/pricing", async (route) => {
    await pending;
    await route.fulfill({
      status: fail ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        fail
          ? { error: { message: "Paket belum dapat dimuat. Coba kembali." } }
          : pricing,
      ),
    });
  });
  try {
    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("status")).toHaveText("Memuat paket...");
  } finally {
    release();
  }
  await expect(page.getByRole("main").getByRole("alert")).toHaveText(
    "Paket belum dapat dimuat. Coba kembali.",
  );
  fail = false;
  await page.getByRole("button", { name: "Muat ulang paket" }).click();
  await expect(
    page.getByRole("heading", { name: "Free", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page).toHaveURL(/\/pricing$/);
});

test("empty pricing can be checked again and retains the comparison table", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/pricing");
  expect(response.ok()).toBe(true);
  const pricing = await response.json();
  let empty = true;
  await page.route("**/api/pricing", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        empty ? { plans: [], paymentReady: false } : pricing,
      ),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pricing");
  await expect(page.getByRole("status")).toHaveText(
    "Belum ada paket yang ditampilkan.",
  );
  empty = false;
  await page.getByRole("button", { name: "Periksa kembali" }).click();
  const comparison = page.getByRole("region", {
    name: "Perbandingan paket Bantuin",
  });
  await expect(comparison).toBeVisible();
  await comparison.focus();
  await comparison.press("ArrowRight");
  await expect
    .poll(() => comparison.evaluate((node) => node.scrollLeft))
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("public navigation and doodle styles stay outside the authenticated workspace", async ({
  page,
  testAccount,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Mulai gratis", exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator(".public-theme")).toHaveCSS(
    "background-color",
    "rgb(240, 251, 255)",
  );
  await expect(
    page.getByRole("link", { name: "Mulai gratis", exact: true }).first(),
  ).toHaveCSS("background-color", "rgb(22, 125, 173)");
  await login(page, testAccount);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator(".public-theme")).toHaveCount(0);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  expect(
    await heading.evaluate((node) => getComputedStyle(node).fontFamily),
  ).toContain("Source Serif 4");
  expect(
    await heading.evaluate((node) =>
      getComputedStyle(node).getPropertyValue("--accent").trim(),
    ),
  ).toBe("#235c46");
  await page.screenshot({ path: "test-results/doodle-workspace-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(heading).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: "test-results/doodle-workspace-mobile.png" });
});
