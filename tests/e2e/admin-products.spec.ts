import { test, expect } from "@playwright/test";

/**
 * E2E: Admin Products management.
 * Skipped — requires authenticated admin session with Supabase.
 * Enable once test auth and seed data are available.
 */

test.describe("Admin Products", () => {
  test.skip(true, "Requires Supabase auth and seed data");

  test.beforeEach(async ({ page }) => {
    // TODO: implement auth helper to set session cookie
    await page.goto("/admin/products");
  });

  test("products table renders with header and pagination", async ({ page }) => {
    await expect(page.locator("text=Товары")).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
    await expect(page.locator("text=Добавить товар")).toBeVisible();
  });

  test("search filters products by name", async ({ page }) => {
    await page.fill("input[placeholder*='Поиск']", "визитки");
    await page.waitForTimeout(500); // debounce
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
  });

  test("opens product dialog on 'Add product' click", async ({ page }) => {
    await page.click("text=Добавить товар");
    await expect(page.locator("text=Основное")).toBeVisible();
    await expect(page.locator("input[name='name']")).toBeVisible();
  });

  test("product dialog has 6 tabs", async ({ page }) => {
    await page.click("text=Добавить товар");
    const tabs = ["Основное", "Цены и склад", "Изображения", "Варианты", "Характеристики", "SEO"];
    for (const tabName of tabs) {
      await expect(page.locator(`text=${tabName}`)).toBeVisible();
    }
  });

  test("auto-generates slug from product name", async ({ page }) => {
    await page.click("text=Добавить товар");
    await page.fill("input[name='name']", "Световые буквы");
    await page.waitForTimeout(300);
    const slugInput = page.locator("input[name='slug']");
    await expect(slugInput).toHaveValue("svetovye-bukvy");
  });

  test("validates required fields on save", async ({ page }) => {
    await page.click("text=Добавить товар");
    await page.click("text=Сохранить");
    await expect(page.locator("text=обязательно")).toBeVisible();
  });

  test("pagination controls navigate between pages", async ({ page }) => {
    const nextBtn = page.locator("button:has-text('Вперёд'), button:has-text('>')");
    if (await nextBtn.isVisible()) {
      await nextBtn.click();
      await expect(page.locator("table tbody tr").first()).toBeVisible();
    }
  });

  test("bulk actions appear when rows are selected", async ({ page }) => {
    const checkbox = page.locator("table tbody tr:first-child input[type='checkbox']");
    await checkbox.check();
    await expect(page.locator("text=Выбрано")).toBeVisible();
  });
});
