import { test, expect } from "@playwright/test";

/**
 * E2E (Этап 7): /admin/leads — новый раздел заявок (заменяет orders).
 *
 * Skip — требует логина + БД.
 */

test.describe("Admin Leads — список заявок", () => {
  test.skip(true, "Требует залогиненного admin + БД с миграцией 006");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("input[name='email'], input[type='email']", "admin");
    await page.fill("input[type='password']", "admin123");
    await page.click("button[type='submit']");
  });

  test("страница /admin/leads рендерится", async ({ page }) => {
    await page.goto("/admin/leads");
    await expect(page.locator("h1, h2").filter({ hasText: /заявк|leads/i })).toBeVisible();
  });

  test("сайдбар содержит ссылку 'Заявки' (а не 'Заказы')", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.locator("a[href='/admin/leads']")).toBeVisible();
    expect(await page.locator("a[href='/admin/orders']").count()).toBe(0);
  });
});
