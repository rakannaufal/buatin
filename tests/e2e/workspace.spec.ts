import { test, expect, login } from "./fixtures";
test("desktop: login, brief, plan, persistent job, safe preview, ZIP, delete", async ({
  page,
  testAccount,
}) => {
  await login(page, testAccount);
  await page.goto("/projects/new");
  await page.getByLabel("Nama proyek").fill("Studio Karsa E2E");
  await page
    .getByLabel("Brief proyek", { exact: true })
    .fill(
      "Landing page Studio Karsa untuk pemilik UMKM. Layanan desain, portofolio, proses kerja dan kontak WhatsApp. Tanpa login dan pembayaran. Mobile menjadi prioritas. Tampilan bersih hijau.",
    );
  await page.getByRole("button", { name: "Buat rencana dokumen" }).click();
  await expect(
    page.getByRole("heading", { name: "Dokumen terpilih" }),
  ).toBeVisible({ timeout: 45000 });
  await expect(
    page.getByRole("checkbox", { name: "Pilih specs/prd.md", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", {
      name: "Pilih specs/payments.md",
      exact: true,
    }),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: "Mulai generasi", exact: true })
    .click();
  await page.getByRole("button", { name: "Konfirmasi dan mulai" }).click();
  await expect(page).toHaveURL(/\/jobs\//);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Dokumen siap ditinjau." }),
  ).toBeVisible({ timeout: 90000 });
  await expect(
    page.getByRole("link", { name: /Lihat hasil|Buka hasil|Tinjau hasil/ }),
  ).toBeVisible({ timeout: 90000 });
  await page
    .getByRole("link", { name: /Lihat hasil|Buka hasil|Tinjau hasil/ })
    .click();
  await expect(
    page.getByText("Mode pengujian aktif.", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".markdown-document h1")).toBeVisible();
  await page.getByRole("button", { name: "Source", exact: true }).click();
  await expect(page.locator(".markdown-source")).toContainText(
    "# Studio Karsa E2E",
  );
  await expect(page.locator(".markdown-source")).toContainText(
    "Layanan desain, portofolio",
  );
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Unduh ZIP", exact: true }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/buatin.zip$/);
  await download.saveAs("test-results/landing-spec-kit.zip");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/desktop-result.png",
    fullPage: true,
  });
  const width = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(width).toBe(true);
  const jobId = page.url().split("/jobs/")[1].split("/")[0];
  const response = await page.request.get(`/api/jobs/${jobId}`);
  const data = await response.json();
  await page.goto(`/projects/${data.job.project.id}`);
  await page.getByRole("button", { name: "Hapus proyek", exact: true }).click();
  await page
    .getByRole("button", { name: "Hapus permanen", exact: true })
    .click();
  await expect(page).toHaveURL(/dashboard/);
  expect(
    (await (await page.request.get("/api/account")).json()).entitlement
      .remaining,
  ).toBe(0);
});
test("mobile: responsive navigation and form", async ({
  page,
  testAccount,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, testAccount);
  await page.getByRole("button", { name: "Buka navigasi" }).click();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Proyek baru" })
    .click();
  await expect(page.getByLabel("Nama proyek")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Nama proyek").fill("Mobile draft");
  await page.getByLabel("Brief proyek", { exact: true }).fill("Pendek");
  await page.getByRole("button", { name: "Buat rencana dokumen" }).click();
  await expect(page.locator(".notice-error")).toContainText("minimal 20");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/mobile-editor.png",
    fullPage: true,
  });
});
test("untrusted Markdown cannot run scripts or load remote images", async ({
  page,
  testAccount,
}) => {
  await login(page, testAccount);
  const headers = { Origin: new URL(page.url()).origin };
  const response = await page.request.post("/api/projects", {
    headers,
    data: {
      name: "Preview safety fixture",
      webType: "landing",
      brief:
        'Website layanan desain UMKM, halaman layanan dan kontak. Tanpa login atau pembayaran. <script>window.__injected=true</script>\n<img src="https://tracking.example/pixel.png" onerror="window.__injected=true">\n[unsafe](javascript:alert(1))\n![remote](https://tracking.example/pixel.png)',
    },
  });
  expect(response.status()).toBe(201);
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
      async () => {
        const result = await page.request.get(`/api/projects/${project.id}`);
        return (await result.json()).project.status;
      },
      { timeout: 45000 },
    )
    .toBe("plan_ready");
  const started = await page.request.post(`/api/projects/${project.id}/jobs`, {
    headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
    data: { planVersion: 1 },
  });
  expect(started.status()).toBe(202);
  const { job } = await started.json();
  await expect
    .poll(
      async () => {
        const result = await page.request.get(`/api/jobs/${job.id}`);
        return (await result.json()).job.status;
      },
      { timeout: 90000 },
    )
    .toBe("partial");
  const trackers: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("tracking.example"))
      trackers.push(request.url());
  });
  await page.goto(`/jobs/${job.id}/result`);
  await expect(page.locator(".markdown-document h1")).toBeVisible();
  expect(await page.evaluate(() => Object.hasOwn(window, "__injected"))).toBe(
    false,
  );
  expect(trackers).toEqual([]);
  await expect(
    page.locator(".markdown-document img,.markdown-document script"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Unduh ZIP", exact: true }),
  ).toBeDisabled();
  expect(
    (
      await page.request.delete(`/api/projects/${project.id}`, { headers })
    ).status(),
  ).toBe(200);
});
