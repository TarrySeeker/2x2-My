import { test, expect } from "@playwright/test";

/**
 * E2E (Этап 7): /admin/content/settings → меняем телефон → видим в Footer.
 *
 * Skip — требует логина + БД.
 */

test.describe("Admin Settings — изменение контактов", () => {
  test.skip(true, "Требует залогиненного admin + БД");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("input[name='email'], input[type='email']", "admin");
    await page.fill("input[type='password']", "admin123");
    await page.click("button[type='submit']");
  });

  test("phone в settings → отображается в Footer", async ({ page, context }) => {
    const newPhone = `+7-901-${Math.floor(1000 + Math.random() * 8999)}-77-40`;

    await page.goto("/admin/content/settings");
    // Кликаем «Контакты» tab
    await page.getByRole("tab", { name: /контакт/i }).click();
    await page.getByLabel(/основной телефон|phone_primary/i).fill(newPhone);
    await page.getByRole("button", { name: /сохранит/i }).click();
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5_000 });

    const userPage = await context.newPage();
    await userPage.goto("/");
    await expect(userPage.locator("footer")).toContainText(newPhone);
  });
});
