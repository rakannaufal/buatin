import { test, expect } from "@playwright/test";

test.beforeEach(async ({ baseURL, request }) => {
  if (
    !baseURL ||
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)
  )
    throw new Error("Public-page tests require a loopback application.");
  expect((await (await request.get("/api/public-config")).json()).mock).toBe(
    true,
  );
});

for (const width of [1440, 390]) {
  test(`about is discoverable and its reading links work at ${width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    if (width < 900)
      await page.getByRole("button", { name: "Menu", exact: true }).click();
    const navigation = page.getByRole("navigation", {
      name: "Navigasi publik",
    });
    await navigation
      .getByRole("link", { name: "Tentang", exact: true })
      .click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Tentang Bantuin.",
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      new URL("/about", page.url()).href,
    );
    const contents = page.getByRole("navigation", {
      name: "Isi halaman tentang",
    });
    const documents = contents.getByRole("link", {
      name: "Isi dokumen",
      exact: true,
    });
    await documents.focus();
    await documents.press("Enter");
    await expect(
      page.getByRole("heading", { name: "Apa yang ada di dalam hasilnya?" }),
    ).toBeInViewport();
    await expect(page.locator("article")).toContainText(
      "Bantuin dikelola secara perorangan",
    );
    await expect(page.locator("article")).toContainText("template terstruktur");
    await expect(page.locator("article")).toContainText(
      "berada di luar layanan Bantuin",
    );
    await expect(
      page
        .getByRole("contentinfo")
        .getByRole("link", { name: "Tentang Bantuin", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    const html = await (await request.get("/about")).text();
    expect(html).toContain("Pengelola dan bantuan.");
    expect(await (await request.get("/sitemap.xml")).text()).toContain(
      "/about</loc>",
    );
    expect(await (await request.get("/robots.txt")).text()).toContain(
      "Allow: /about",
    );
  });

  test(`unknown routes return a themed 404 with working recovery at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/halaman-yang-tidak-ada/contoh");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Halaman tidak ditemukan.",
    );
    expect(
      await page
        .locator('meta[name="robots"]')
        .evaluateAll((tags) =>
          tags.some((tag) => tag.getAttribute("content")?.includes("noindex")),
        ),
    ).toBe(true);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page
      .getByRole("main")
      .getByRole("link", { name: "Lihat FAQ", exact: true })
      .click();
    await expect(page).toHaveURL(/\/faq$/);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Halaman tidak ditemukan.",
    );
    await page
      .getByRole("main")
      .getByRole("link", { name: "Kembali ke beranda", exact: true })
      .click();
    await expect(page).toHaveURL(/\/$/);
  });
}
