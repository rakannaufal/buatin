import { test, expect } from "@playwright/test";

const pages = [
  ["/terms", "Ketentuan layanan"],
  ["/privacy", "Kebijakan privasi"],
  ["/refund", "Kebijakan pengembalian dana"],
  ["/disclaimer", "Batas penggunaan hasil"],
  ["/cookies", "Kebijakan cookie"],
  ["/faq", "Pertanyaan yang sering diajukan"],
  ["/contact", "Kontak dan pengaduan"],
] as const;

test.beforeEach(async ({ baseURL, request }) => {
  if (
    !baseURL ||
    !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)
  )
    throw new Error("Public-page fixtures require a loopback application.");
  const response = await request.get("/api/public-config");
  expect((await response.json()).mock).toBe(true);
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`service pages are public and readable at ${viewport.width}px`, async ({
    page,
    request,
  }) => {
    await page.setViewportSize(viewport);
    for (const [path, title] of pages) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.locator("article time")).toHaveAttribute(
        "datetime",
        "2026-10-24",
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        new URL(path, page.url()).href,
      );
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        /Buatin/,
      );
      expect(await page.locator("article").innerText()).not.toMatch(
        /lorem ipsum|\[nama|\[email|belum dikonfigurasi|seamless|revolutionary/i,
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth,
        ),
      ).toBe(false);
      const footer = page.getByRole("contentinfo");
      await expect(footer.locator(".footer-bottom")).toContainText(
        "Website made with",
      );
      await expect(
        footer.getByRole("link", { name: "Kembali ke atas" }),
      ).toHaveCount(0);
      await expect(footer).not.toContainText(
        "Buatin. Dokumen perencanaan website.",
      );
      for (const group of ["Produk", "Bantuan", "Kebijakan"]) {
        await expect(
          footer.getByRole("heading", { name: group, exact: true }),
        ).toBeVisible();
      }
      for (const [destination] of pages) {
        const link = footer.locator(`a[href="${destination}"]`);
        await expect(link).toBeVisible();
        const box = await link.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    }
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: "FAQ", exact: true })
      .click();
    await expect(page).toHaveURL(/\/faq$/);
    const privacy = page
      .getByRole("contentinfo")
      .getByRole("link", { name: "Kebijakan privasi", exact: true });
    await privacy.focus();
    await privacy.press("Enter");
    await expect(page).toHaveURL(/\/privacy$/);
    await page.getByRole("link", { name: "Akun", exact: true }).click();
    await expect(page).toHaveURL(/\/login/);

    const sitemap = await request.get("/sitemap.xml");
    const xml = await sitemap.text();
    expect(sitemap.status()).toBe(200);
    for (const [path] of pages) expect(xml).toContain(`${path}</loc>`);
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    for (const [path] of pages)
      expect(await robots.text()).toContain(`Allow: ${path}`);
  });
}

test("policy content arrives in HTML without an account or marketing trackers", async ({
  request,
}) => {
  for (const [path, title] of pages) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(title);
    expect(html).toContain("Buatin dikelola secara perorangan");
    expect(html).not.toMatch(
      /<script[^>]+(?:google-analytics|googletagmanager|_vercel\/insights|_vercel\/speed-insights)/i,
    );
  }
  const terms = await (await request.get("/terms")).text();
  expect(terms).toContain("Tidak ada autodebit");
  expect(terms).toContain("hak konsumen yang dijamin undang-undang");
  const refund = await (await request.get("/refund")).text();
  expect(refund).toContain("tidak terjadi otomatis setelah tiket dikirim");
  expect(refund).toContain("Pengembalian kuota bukan pengganti refund uang");
});
