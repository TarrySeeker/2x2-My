import { test, expect } from "@playwright/test";

/**
 * E2E (Этап 7): создание акции с show_as_popup=true → попап на главной.
 *
 * Skip — требует логина + БД.
 */

test.describe("Admin Promotions — попап-флоу", () => {
  test.skip(true, "Требует залогиненного admin + БД");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("input[name='email'], input[type='email']", "admin");
    await page.fill("input[type='password']", "admin123");
    await page.click("button[type='submit']");
  });

  test("create promo with popup → главная показывает попап (раз за сессию)", async ({
    page,
    context,
  }) => {
    const title = `E2E Промо ${Date.now()}`;

    await page.goto("/admin/content/promotions/new");
    await page.getByLabel(/заголов/i).first().fill(title);
    await page.getByLabel(/описан|тело|body/i).first().fill("Тело акции для попапа");
    // is_active true по умолчанию
    const popupCheckbox = page.getByRole("checkbox", { name: /попап|popup/i });
    await popupCheckbox.check();
    await page.getByRole("button", { name: /сохранит|созд/i }).click();
    await expect(page).toHaveURL(/\/admin\/content\/promotions/);

    // Свежая вкладка → попап должен показаться
    const userPage = await context.newPage();
    await userPage.goto("/", { waitUntil: "networkidle" });
    // PromoPopupBanner появляется через ~600мс
    await userPage.waitForTimeout(800);
    const banner = userPage.locator("[role='region'][aria-label='Акция']");
    await expect(banner).toBeVisible({ timeout: 3_000 });
    await expect(banner).toContainText(title);

    // Закрыть → не показывается повторно при перезагрузке (sessionStorage)
    await banner.getByRole("button", { name: /закрыть/i }).click();
    await userPage.reload({ waitUntil: "networkidle" });
    await userPage.waitForTimeout(800);
    await expect(banner).not.toBeVisible();
  });
});
