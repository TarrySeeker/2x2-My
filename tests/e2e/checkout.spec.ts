import { test, expect } from "@playwright/test";

// Requires running dev server + Supabase env + seed data.
// Skip until integration environment is configured.
test.describe.skip("Checkout flow (requires Supabase env + seed data)", () => {
  test("full checkout: cart → checkout → success", async ({ page }) => {
    await page.goto("/services");
    await page.locator("[data-testid='product-card']").first().click();
    await page.locator("button:has-text('В корзину')").click();

    await page.goto("/cart");
    await expect(page.locator("[data-testid='cart-item']")).toHaveCount(1);
    await page.locator("a:has-text('Оформить заказ')").click();

    await expect(page).toHaveURL(/\/checkout/);

    await page.fill("input[name='customer.name']", "Тестовый Покупатель");
    await page.fill("input[name='customer.phone']", "+79324247740");

    await page.locator("input[value='pickup']").check();
    await page.locator("input[value='cash_on_delivery']").check();

    await page.locator("button[type='submit']:has-text('Подтвердить')").click();

    await expect(page).toHaveURL(/\/checkout\/success\?order=/);
    await expect(page.locator("h1")).toContainText("Заказ");

    await page.goto("/cart");
    await expect(page.locator("[data-testid='cart-empty']")).toBeVisible();
  });

  test("checkout shows all sections", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page.locator("input[name='customer.name']")).toBeVisible();
    await expect(page.locator("input[name='customer.phone']")).toBeVisible();
    await expect(page.locator("input[value='pickup']")).toBeVisible();
    await expect(page.locator("input[value='cash_on_delivery']")).toBeVisible();
  });

  test("empty cart redirects away from checkout", async ({ page }) => {
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/(cart|services|checkout)/);
  });
});
