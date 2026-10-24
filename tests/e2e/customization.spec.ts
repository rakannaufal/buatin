import { test, expect, login } from "./fixtures";

const section = (page: import("@playwright/test").Page, name: string) =>
  page
    .locator("details.preference-section")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
test("desktop: customize reference, stack, colors and typography with internal skills through generation", async ({
  page,
  testAccount,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1050 });
  await login(page, testAccount);
  await page.goto("/projects/new");
  await page.getByLabel("Nama proyek").fill("Karsa custom fixture");
  await page
    .getByLabel("Brief proyek", { exact: true })
    .fill(
      "Landing page Studio Karsa untuk pemilik UMKM. Layanan desain, proses kerja, portofolio dan kontak WhatsApp. Tanpa login atau pembayaran. Prioritas mobile dan SEO.",
    );
  await page.getByLabel("Pilih file referensi", { exact: true }).setInputFiles({
    name: "karsa.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(
      "# Brand Karsa\nGunakan komposisi editorial dengan daftar layanan yang jelas.",
    ),
  });
  const references = section(page, "Referensi gambar dan file");
  await expect(
    references.getByText("Siap digunakan", { exact: false }),
  ).toBeVisible({ timeout: 45000 });
  await references
    .getByLabel("Catatan referensi karsa.md")
    .fill("Ikuti komposisi editorial; warna memakai palet sendiri.");
  await expect(
    page.getByRole("button", { name: "Buat rencana dokumen" }),
  ).toBeDisabled();
  await references
    .getByRole("button", { name: "Simpan catatan referensi", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Buat rencana dokumen" }),
  ).toBeEnabled();
  const tech = section(page, "Teknologi website");
  await tech.locator("summary").click();
  await tech.getByRole("radio", { name: "Manual", exact: true }).check();
  await tech.locator("#tech-frontend").selectOption("Astro");
  await tech.locator("#tech-rendering").selectOption("SSG");
  await tech.getByLabel("Cari kategori atau teknologi").fill("database");
  await tech.locator("#tech-database").selectOption("none");
  await tech.getByLabel("Cari kategori atau teknologi").clear();
  const colors = section(page, "Palet warna");
  await colors.locator("summary").click();
  await colors.getByRole("radio", { name: "Manual", exact: true }).check();
  await colors.getByLabel("HEX Primary", { exact: true }).fill("#135");
  await colors.getByLabel("HEX Secondary", { exact: true }).fill("#FED");
  for (let i = 2; i < 10; i++)
    await colors.getByRole("button", { name: /^Tambah warna/ }).click();
  await expect(
    colors.getByRole("button", { name: "Tambah warna (10/10)" }),
  ).toBeDisabled();
  await colors.getByLabel("HEX Primary", { exact: true }).fill("#GGGGGG");
  await page.getByRole("button", { name: "Simpan draft", exact: true }).click();
  await expect(
    colors.getByText("Gunakan #RGB atau #RRGGBB.", { exact: true }),
  ).toBeVisible();
  await colors.getByLabel("HEX Primary", { exact: true }).fill("#135");
  await colors.getByLabel("HEX Primary", { exact: true }).blur();
  const style = section(page, "Gaya dan tipografi");
  await style.locator("summary").click();
  await style.getByRole("radio", { name: "Manual", exact: true }).check();
  await style.getByLabel("Font heading", { exact: true }).selectOption("Lora");
  await style.getByLabel("Layout", { exact: true }).selectOption("Asymmetric");
  await style
    .getByLabel("Intensitas animasi", { exact: true })
    .selectOption("None");
  await style.getByRole("button", { name: "Mobile", exact: true }).click();
  await expect(style.locator(".design-preview")).toHaveClass(/preview-mobile/);
  await style.screenshot({
    path: "test-results/customization-desktop-style.png",
  });
  await expect(section(page, "Skill dan panduan")).toHaveCount(0);
  await expect(page.getByText("Skill aktif", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Simpan draft", exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/[a-f0-9-]+$/);
  await page.reload();
  const reopenedColors = section(page, "Palet warna");
  await reopenedColors.locator("summary").click();
  await expect(reopenedColors.locator(".palette-row")).toHaveCount(10);
  await expect(
    reopenedColors.getByLabel("HEX Primary", { exact: true }),
  ).toHaveValue("#113355");
  await reopenedColors
    .getByRole("radio", { name: "Otomatis", exact: true })
    .check();
  await reopenedColors
    .getByRole("radio", { name: "Manual", exact: true })
    .check();
  await expect(reopenedColors.locator(".palette-row")).toHaveCount(10);
  await page.getByRole("button", { name: "Buat rencana dokumen" }).click();
  await expect(
    page.getByRole("heading", { name: "Dokumen terpilih" }),
  ).toBeVisible({ timeout: 45000 });
  await page.locator(".plan-customization > summary").click();
  await expect(page.locator(".plan-customization")).toContainText("Astro");
  await expect(page.locator(".plan-customization")).not.toContainText(
    "Webapp Testing",
  );
  await expect(page.locator(".plan-customization")).not.toContainText(
    "Anti-slop",
  );
  await page
    .getByRole("button", { name: "Mulai generasi", exact: true })
    .click();
  await page.getByRole("button", { name: "Konfirmasi dan mulai" }).click();
  await expect(page).toHaveURL(/\/jobs\//);
  await expect(
    page.getByRole("heading", { name: "Dokumen siap ditinjau.", exact: true }),
  ).toBeVisible({ timeout: 90000 });
  const jobId = page.url().split("/jobs/")[1].split("/")[0];
  const setupOutput = await page.request.get(`/api/jobs/${jobId}/files/skills`);
  expect(setupOutput.status()).toBe(200);
  const setup = (await setupOutput.json()).file;
  expect(setup.path).toBe("SKILLS.md");
  expect(setup.content).toContain("bantuin-antislop/SKILL.md");
  expect(setup.content).toContain("belum diverifikasi");
  const output = await page.request.get(`/api/jobs/${jobId}/files/design`);
  expect(output.status()).toBe(200);
  const { file } = await output.json();
  expect(file.content).toContain("#113355");
  expect(file.content).toContain("Lora");
  expect(file.content).toContain("komposisi editorial");
  expect(file.content).toContain("Jangan lazy-load hero/gambar LCP");
  expect(file.content).toContain("prefers-reduced-motion");
  expect(failures).toEqual([]);
});

test("mobile: accessible customization, retained manual choices and no overflow", async ({
  page,
  testAccount,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, testAccount);
  await page.goto("/projects/new");
  await page.getByLabel("Nama proyek").fill("Mobile custom fixture");
  const colors = section(page, "Palet warna");
  await colors.locator("summary").focus();
  await page.keyboard.press("Enter");
  await colors.getByRole("radio", { name: "Manual", exact: true }).check();
  await colors.getByLabel("HEX Primary", { exact: true }).fill("#ABC");
  await colors.getByLabel("HEX Primary", { exact: true }).blur();
  await colors.getByRole("button", { name: /^Tambah warna/ }).click();
  await expect(colors.getByLabel("HEX Primary", { exact: true })).toHaveValue(
    "#AABBCC",
  );
  await colors
    .getByRole("button", { name: "Hapus warna 3", exact: true })
    .click();
  await expect(colors.locator(".palette-row")).toHaveCount(2);
  await colors.screenshot({
    path: "test-results/customization-mobile-colors.png",
  });
  const style = section(page, "Gaya dan tipografi");
  await style.locator("summary").click();
  await style.getByRole("radio", { name: "Manual", exact: true }).check();
  await style
    .getByLabel("Font heading", { exact: true })
    .selectOption("Source Serif 4");
  await style.getByRole("radio", { name: "Otomatis", exact: true }).check();
  await style.getByRole("radio", { name: "Manual", exact: true }).check();
  await expect(style.getByLabel("Font heading", { exact: true })).toHaveValue(
    "Source Serif 4",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(section(page, "Skill dan panduan")).toHaveCount(0);
  await expect(page.getByText("Skill aktif", { exact: true })).toHaveCount(0);
  await page.getByLabel("Pilih file referensi", { exact: true }).setInputFiles({
    name: "unsafe.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(
    section(page, "Referensi gambar dan file").locator(".notice-error"),
  ).toContainText("PNG");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
