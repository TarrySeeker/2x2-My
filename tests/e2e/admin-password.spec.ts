import { test, expect } from "@playwright/test";

/**
 * E2E (Этап 7): смена своего пароля + force-change флоу.
 *
 * Skip — требует логина и возможности изменить пароль (не использовать
 * этот тест на проде с реальным админ-аккаунтом).
 */

test.describe("Admin Password — смена пароля", () => {
  test.skip(true, "Требует залогиненного admin + БД с testovыми credentials");

  test("логин → /admin/settings/account/password → смена → logout → login с новым", async ({
    page,
  }) => {
    const oldPass = "admin123";
    const newPass = `NewSecure${Date.now()}!@`;

    // Login со старым
    await page.goto("/admin/login");
    await page.fill("input[name='email'], input[type='email']", "admin");
    await page.fill("input[type='password']", oldPass);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/admin\/(dashboard|settings\/account\/password)/);

    // Сменить пароль
    await page.goto("/admin/settings/account/password");
    await page.getByLabel(/текущий пароль/i).fill(oldPass);
    await page.getByLabel(/новый пароль$/i).fill(newPass);
    await page.getByLabel(/повтор|подтвержд/i).fill(newPass);
    await page.getByRole("button", { name: /сменит|сохранит/i }).click();
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5_000 });
    // На success redirect → /admin/dashboard
    await page.waitForURL(/\/admin\/dashboard/);

    // Logout
    await page.getByRole("button", { name: /выйт|logout/i }).click();
    await page.waitForURL(/\/admin\/login/);

    // Login с новым
    await page.fill("input[name='email'], input[type='email']", "admin");
    await page.fill("input[type='password']", newPass);
    await page.click("button[type='submit']");
    await page.waitForURL(/\/admin\/dashboard/);

    // Восстановить старый пароль (cleanup) — критично, иначе следующие
    // прогоны теста сломаются.
    await page.goto("/admin/settings/account/password");
    await page.getByLabel(/текущий пароль/i).fill(newPass);
    await page.getByLabel(/новый пароль$/i).fill(oldPass);
    await page.getByLabel(/повтор|подтвержд/i).fill(oldPass);
    await page.getByRole("button", { name: /сменит|сохранит/i }).click();
  });
});
