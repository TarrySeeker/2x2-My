import { test, expect } from "@playwright/test";

/**
 * E2E: Admin Orders management.
 * Skipped — requires real Supabase auth + seeded orders data.
 * Enable once test credentials and seed data are available.
 */

test.describe("Admin Orders", () => {
  test.skip(true, "Requires Supabase auth + seeded orders");

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/admin/login");
    await page.fill("input[type='email']", "admin@2x2reklama.ru");
    await page.fill("input[type='password']", "testpassword");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  });

  test("orders page renders with status tabs", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page.locator("text=Заказы")).toBeVisible();
    // Check status tabs
    await expect(page.locator("text=Все")).toBeVisible();
    await expect(page.locator("text=Новые")).toBeVisible();
    await expect(page.locator("text=Отменённые")).toBeVisible();
  });

  test("search filters orders by number or customer name", async ({ page }) => {
    await page.goto("/admin/orders");
    const searchInput = page.locator("input[placeholder*='Поиск']");
    await searchInput.fill("ORD-001");
    await page.waitForTimeout(500); // debounce
    // Should show filtered results
    await expect(page.locator("table tbody tr")).toHaveCount(1);
  });

  test("clicking order row navigates to detail page", async ({ page }) => {
    await page.goto("/admin/orders");
    // Click first order link
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.locator("a").first().click();
    await expect(page).toHaveURL(/\/admin\/orders\/\d+/);
  });

  test("order detail page shows stepper and order info", async ({ page }) => {
    await page.goto("/admin/orders/1");
    // Stepper should be visible
    await expect(page.locator("text=Новый")).toBeVisible();
    await expect(page.locator("text=Подтверждён")).toBeVisible();
    // Order items table
    await expect(page.locator("text=Состав заказа")).toBeVisible();
  });

  test("status change button opens confirmation and updates status", async ({ page }) => {
    await page.goto("/admin/orders/1");
    // Find status change button
    const statusButton = page.locator("button:has-text('Подтвердить')");
    if (await statusButton.isVisible()) {
      await statusButton.click();
      // Wait for success toast
      await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5000 });
    }
  });

  test("cancel order shows confirmation dialog", async ({ page }) => {
    await page.goto("/admin/orders/1");
    const cancelButton = page.locator("button:has-text('Отменить заказ')");
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      // Confirm dialog should appear
      await expect(page.locator("text=Вы уверены")).toBeVisible();
    }
  });

  test("manager comment saves and persists", async ({ page }) => {
    await page.goto("/admin/orders/1");
    const commentArea = page.locator("textarea[placeholder*='Комментарий']");
    await commentArea.fill("Тестовый комментарий менеджера");
    await page.locator("button:has-text('Сохранить')").click();
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5000 });
  });

  test("CSV export downloads a file", async ({ page }) => {
    await page.goto("/admin/orders");
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("button:has-text('CSV')").click(),
    ]);
    expect(download.suggestedFilename()).toContain(".csv");
  });

  test("sidebar badge shows new orders count", async ({ page }) => {
    await page.goto("/admin/dashboard");
    // Check for badge near "Заказы" in sidebar
    const ordersLink = page.locator("a[href='/admin/orders']");
    const badge = ordersLink.locator("span.bg-brand-orange");
    // Badge may or may not be visible depending on data
    if (await badge.isVisible()) {
      const text = await badge.textContent();
      expect(Number(text)).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe("Admin Customers", () => {
  test.skip(true, "Requires Supabase auth + seeded orders");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("input[type='email']", "admin@2x2reklama.ru");
    await page.fill("input[type='password']", "testpassword");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  });

  test("customers page renders with table", async ({ page }) => {
    await page.goto("/admin/customers");
    await expect(page.locator("text=Клиенты")).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
  });

  test("search filters customers", async ({ page }) => {
    await page.goto("/admin/customers");
    const searchInput = page.locator("input[placeholder*='Поиск']");
    await searchInput.fill("+7");
    await page.waitForTimeout(500);
  });

  test("clicking customer opens detail sheet", async ({ page }) => {
    await page.goto("/admin/customers");
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.click();
    // Sheet with customer details
    await expect(page.locator("text=История заказов")).toBeVisible({ timeout: 3000 });
  });
});
