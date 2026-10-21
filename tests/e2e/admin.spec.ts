import { test, expect, login } from "./fixtures";
import { db } from "../../src/server/db";
import { clearTestBilling } from "../helpers/saas";

test("owner manages credits, voucher versions and audit from desktop and mobile", async ({
  page,
  testAccount,
}) => {
  const targetId = crypto.randomUUID(),
    code =
      `E2E${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`.toUpperCase();
  await db.user.update({
    where: { id: testAccount.id },
    data: { role: "owner" },
  });
  await db.user.create({
    data: {
      id: targetId,
      name: "E2E customer",
      email: `e2e-${targetId}@localhost.test`,
      emailVerified: true,
    },
  });
  try {
    await login(page, testAccount);
    await page.goto(`/admin/users/${targetId}`);
    await page
      .getByLabel("Password verifikasi admin")
      .fill(testAccount.password);
    await page
      .getByRole("button", { name: "Verifikasi akses", exact: true })
      .click();
    await expect(
      page.getByText("Perubahan admin terbuka sementara", { exact: true }),
    ).toBeVisible();
    const credit = page.locator("form").filter({
      has: page.getByRole("heading", { name: "Bonus generasi", exact: true }),
    });
    await credit.getByLabel("Jumlah generasi").fill("2");
    await credit.getByLabel("Berlaku hari").fill("7");
    await credit
      .getByLabel("Alasan perubahan")
      .fill("Reviewed customer compensation fixture");
    await credit
      .getByRole("button", { name: "Berikan kredit", exact: true })
      .click();
    await expect
      .poll(() => db.creditGrant.count({ where: { userId: targetId } }))
      .toBe(1);
    await page.goto("/admin/vouchers");
    await page.getByText("Buat voucher baru", { exact: true }).click();
    const voucher = page.locator("form").filter({
      has: page.getByRole("heading", { name: "Voucher baru", exact: true }),
    });
    await voucher.getByLabel("Kode voucher").fill(code);
    await voucher.getByLabel("Nama promosi").fill("Reviewed E2E promotion");
    await voucher.getByLabel("Nilai diskon").fill("10");
    await voucher
      .getByLabel("Mulai, waktu lokal perangkat")
      .fill(new Date(Date.now() - 86400000).toISOString().slice(0, 16));
    await voucher
      .getByLabel("Berakhir, waktu lokal perangkat")
      .fill(new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16));
    await voucher
      .getByLabel("Alasan perubahan")
      .fill("Prepare reviewed promotional voucher");
    await voucher
      .getByRole("button", { name: "Buat voucher", exact: true })
      .click();
    const entry = page.getByRole("link").filter({ hasText: code });
    await expect(entry).toBeVisible();
    await entry.click();
    await expect(
      page.getByRole("heading", { name: `Edit ${code}`, exact: true }),
    ).toBeVisible();
    await page.getByLabel("Status promosi").selectOption("active");
    await page
      .getByLabel("Alasan perubahan")
      .fill("Publish reviewed promotion fixture");
    await page
      .getByRole("button", { name: "Simpan perubahan voucher", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await db.voucher.findUniqueOrThrow({ where: { code } })).version,
      )
      .toBe(2);
    await expect(
      page.getByRole("heading", { name: "Riwayat aturan voucher" }),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/admin-voucher-desktop.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".admin-mobile-menu select").selectOption("audit");
    await expect(
      page.getByRole("heading", { name: "Audit.", exact: true }),
    ).toBeVisible();
    await page.getByLabel("Cari nama, email atau ID").fill("voucher.updated");
    await page
      .getByRole("button", { name: "Terapkan filter", exact: true })
      .click();
    await expect(
      page.getByRole("cell", { name: /voucher.updated/ }).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: "test-results/admin-audit-mobile.png",
      fullPage: true,
      animations: "disabled",
    });
    await page.getByLabel("Cari nama, email atau ID").focus();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Terapkan filter", exact: true }),
    ).toBeFocused();
  } finally {
    await clearTestBilling(targetId);
    await db.user.delete({ where: { id: targetId } });
    const voucher = await db.voucher.findUnique({ where: { code } });
    if (voucher) {
      await db.voucherVersion.deleteMany({ where: { voucherId: voucher.id } });
      await db.voucher.delete({ where: { id: voucher.id } });
    }
  }
});

test("user opens a support ticket and sends a reply without duplicate messages", async ({
  page,
  testAccount,
}) => {
  await login(page, testAccount);
  await page.goto("/support");
  await page
    .getByLabel("Judul permintaan")
    .fill("Question about document generation");
  await page
    .getByLabel("Pesan", { exact: true })
    .fill("Please help review my document generation workflow.");
  await page
    .getByRole("button", { name: "Buat tiket bantuan", exact: true })
    .click();
  await expect(page).toHaveURL(/\/support\/[^/]+$/);
  await expect(
    page.getByRole("heading", {
      name: "Question about document generation",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Pesan", { exact: true })
    .fill("Here is additional context about the issue.");
  await page
    .getByRole("button", { name: "Kirim balasan", exact: true })
    .click();
  await expect(
    page.getByText("Here is additional context about the issue.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await db.supportMessage.count({
      where: { ticket: { userId: testAccount.id } },
    }),
  ).toBe(2);
  const ticket = await db.supportTicket.findFirstOrThrow({
    where: { userId: testAccount.id },
  });
  const time = Date.now() - 4000;
  await db.supportMessage.createMany({
    data: Array.from({ length: 22 }, (_, index) => ({
      ticketId: ticket.id,
      authorId: testAccount.id,
      body: `Pagination fixture ${index}`,
      createdAt: new Date(time + index * 10),
    })),
  });
  await page.reload();
  await page
    .getByRole("button", { name: "Pesan sebelumnya", exact: true })
    .click();
  await expect(
    page.getByText("Pagination fixture 0", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Pesan", { exact: true })
    .fill("Reply from previous history page.");
  await page
    .getByRole("button", { name: "Kirim balasan", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/support/${ticket.id}$`));
  await expect(
    page.getByText("Reply from previous history page.", { exact: true }),
  ).toBeVisible();
  expect(
    await db.supportMessage.count({ where: { ticketId: ticket.id } }),
  ).toBe(25);
});
