import { test, expect } from "@playwright/test";

/**
 * E2E (Этап 7): /admin/content/team CRUD сотрудников + проверка на /about.
 *
 * Skip — требует логина + БД.
 */

test.describe("Admin Team — добавление сотрудника", () => {
  test.skip(true, "Требует залогиненного admin + БД");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("input[name='email'], input[type='email']", "admin");
    await page.fill("input[type='password']", "admin123");
    await page.click("button[type='submit']");
  });

  test("добавление → появление на /about", async ({ page, context }) => {
    const uniqueName = `Тест Сотрудник ${Date.now()}`;

    await page.goto("/admin/content/team");
    await page.getByRole("button", { name: /добавит|новый/i }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/имя/i).fill(uniqueName);
    await dialog.getByLabel(/должност|роль/i).fill("QA Engineer");
    // Загрузка фото — пропускаем (файл не передаём, photo_url остаётся null).

    // is_active по умолчанию true.
    await dialog.getByRole("button", { name: /сохранит|создат/i }).click();

    // Карточка появилась
    await expect(page.locator(`text=${uniqueName}`)).toBeVisible();

    // Проверка на /about
    const newPage = await context.newPage();
    await newPage.goto("/about", { waitUntil: "networkidle" });
    await expect(newPage.locator(`text=${uniqueName}`)).toBeVisible();
  });
});
