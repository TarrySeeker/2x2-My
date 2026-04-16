import { test, expect } from "@playwright/test";

/**
 * E2E: Admin Login page.
 * Skipped — requires real Supabase auth to be configured.
 * Enable once test credentials are available.
 */

test.describe("Admin Login", () => {
  test.skip(true, "Requires Supabase auth configuration");

  test("login page renders with form fields", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.locator("button[type='submit']")).toBeVisible();
  });

  test("shows validation errors for empty fields", async ({ page }) => {
    await page.goto("/admin/login");
    await page.click("button[type='submit']");
    await expect(page.locator("text=обязательно")).toBeVisible();
  });

  test("eye toggle reveals password", async ({ page }) => {
    await page.goto("/admin/login");
    const passwordInput = page.locator("input[type='password']");
    await passwordInput.fill("test123");
    await page.click("[aria-label*='показать']");
    await expect(page.locator("input[type='text'][value='test123']")).toBeVisible();
  });

  test("shows error toast on invalid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("input[type='email']", "wrong@example.com");
    await page.fill("input[type='password']", "wrongpassword");
    await page.click("button[type='submit']");
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5000 });
  });

  test("redirects to dashboard on successful login", async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("input[type='email']", "admin@2x2reklama.ru");
    await page.fill("input[type='password']", "testpassword");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 10000 });
  });
});
