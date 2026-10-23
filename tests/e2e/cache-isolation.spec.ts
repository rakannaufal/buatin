import { randomBytes } from "node:crypto";
import { test, expect, login, removeAccount } from "./fixtures";
import { createAuth } from "../../src/server/auth";
import { db } from "../../src/server/db";

test("discards private data across logout and login in the same tab", async ({
  page,
  testAccount,
  baseURL,
}) => {
  const password = randomBytes(24).toString("base64url");
  const email = `e2e-${crypto.randomUUID()}@localhost.test`;
  const result = await createAuth(true).api.signUpEmail({
    body: { name: "Second account", email, password },
  });
  const second = { id: result.user.id, email, password };
  const privateName = `Private project ${crypto.randomUUID()}`;
  try {
    await db.user.update({
      where: { id: second.id },
      data: { emailVerified: true },
    });
    await db.project.create({
      data: {
        userId: testAccount.id,
        name: privateName,
        webType: "landing",
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    await login(page, testAccount);
    await expect(page.getByText(privateName, { exact: true })).toBeVisible();
    await page.evaluate(() => {
      Object.assign(window, { previousSessionMarker: true });
    });
    await page.getByRole("button", { name: "Keluar", exact: true }).click();
    await expect(page).toHaveURL(/\/login/);
    expect(await page.evaluate(() => "previousSessionMarker" in window)).toBe(
      false,
    );
    await login(page, second);
    await expect(page.getByText(privateName, { exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Akun", exact: true }).click();
    await expect(
      page.getByLabel("Email terverifikasi", { exact: true }),
    ).toHaveValue(second.email);
    await page.context().setOffline(true);
    await expect(page.getByText(privateName, { exact: true })).toHaveCount(0);
    await page.context().setOffline(false);
  } finally {
    await page.context().setOffline(false);
    await removeAccount(second, page.request, baseURL!);
  }
});
