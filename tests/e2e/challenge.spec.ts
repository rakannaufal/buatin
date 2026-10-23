import { test, expect } from "./fixtures";
import { getEnv } from "../../src/server/config";

test.skip(
  !getEnv().TURNSTILE_SITE_KEY,
  "Run the challenge fixture with a test-only TURNSTILE_SITE_KEY.",
);

test("Turnstile recovery clears stale errors while expired tokens stay blocked", async ({
  page,
  testAccount,
}) => {
  expect(testAccount.email).toMatch(/^e2e-/);
  await page.route(
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
    async (route) => {
      await route.fulfill({
        contentType: "application/javascript",
        body: `
          let nextWidget = 0;
          window.turnstile = {
            render(container, options) {
              const widget = document.createElement('div');
              widget.id = 'fixture-challenge-' + ++nextWidget;
              for (const [label, callback] of [
                ['Fixture challenge error', () => options['error-callback']()],
                ['Fixture challenge success', () => options.callback('fixture-turnstile-token')],
                ['Fixture challenge expired', () => options['expired-callback']()],
              ]) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = label;
                button.addEventListener('click', callback);
                widget.append(button);
              }
              container.replaceChildren(widget);
              return widget.id;
            },
            remove(id) { document.getElementById(id)?.remove(); },
          };
        `,
      });
    },
  );
  let attempts = 0;
  await page.route("**/api/auth/sign-in/social", async (route) => {
    attempts++;
    expect(route.request().headers()["x-turnstile-token"]).toBe(
      "fixture-turnstile-token",
    );
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: "{}",
    });
  });
  await page.goto("/login");
  const google = page.getByRole("button", { name: "Lanjutkan dengan Google" });
  const challengeError = page.getByText(
    "Verifikasi keamanan belum dapat dimuat. Muat ulang halaman.",
    { exact: true },
  );
  await google.click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Selesaikan verifikasi keamanan",
  );
  expect(attempts).toBe(0);
  await page.getByRole("button", { name: "Fixture challenge error" }).click();
  await expect(challengeError).toBeVisible();
  await page.getByRole("button", { name: "Fixture challenge success" }).click();
  await expect(challengeError).toHaveCount(0);
  await google.click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Login Google belum tersedia",
  );
  expect(attempts).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Fixture challenge error" }).click();
  await expect(challengeError).toBeVisible();
  await page.getByRole("button", { name: "Fixture challenge success" }).click();
  await expect(challengeError).toHaveCount(0);
  await page.getByRole("button", { name: "Fixture challenge expired" }).click();
  await google.click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Selesaikan verifikasi keamanan",
  );
  expect(attempts).toBe(1);
});
