import { test, expect } from "@playwright/test";

/**
 * E2E (Этап 7): редактирование CMS-секции главной через админку.
 *
 * Сценарий:
 *   1. Логин под админом (owner)
 *   2. Открыть /admin/content/homepage
 *   3. Кликнуть «Hero» → /admin/content/homepage/hero
 *   4. Изменить headline_line1, сохранить
 *   5. Открыть / в новой вкладке → увидеть новый headline
 *      (revalidateTag('cms:hero') + revalidatePath('/'))
 *
 * Skip — требует залогиненного админа и БД.
 * Чтобы запустить:
 *  - убрать .skip
 *  - убедиться что в БД есть owner с известным паролем (см. сидинг 003)
 *  - желательно: APPLY_SEED_CMS=true для дефолтных секций
 */

test.describe("Admin CMS — редактирование Hero и проверка на витрине", () => {
  test.skip(true, "Требует залогиненного admin + БД (миграция 006 + сидинг)");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.fill("input[name='email'], input[type='email']", "admin");
    await page.fill("input[type='password']", "admin123");
    await page.click("button[type='submit']");
    await expect(page).toHaveURL(/\/admin\/(dashboard|settings\/account\/password)/, {
      timeout: 10_000,
    });
  });

  test("список секций показывает 8 ключей", async ({ page }) => {
    await page.goto("/admin/content/homepage");
    for (const key of [
      "hero",
      "about",
      "services",
      "promotions",
      "portfolio",
      "features",
      "faq",
      "cta",
    ]) {
      await expect(
        page.locator(`a[href*='/admin/content/homepage/${key}']`),
      ).toBeVisible();
    }
  });

  test("изменение headline в hero отражается на главной", async ({ page, context }) => {
    const uniqueText = `E2E Test ${Date.now()}`;

    await page.goto("/admin/content/homepage/hero");
    // Найти input, помеченный как headline_accent или headline_line1
    const accentInput = page.locator(
      "input[name='headline_accent'], input[name*='accent']",
    );
    await accentInput.fill(uniqueText);
    await page.getByRole("button", { name: /сохранит|сохран/i }).click();

    // Подождать toast «сохранено»
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 5_000 });

    // Открыть главную в новом контексте — обходим кеш страницы
    const newPage = await context.newPage();
    await newPage.goto("/", { waitUntil: "networkidle" });
    await expect(newPage.locator("h1")).toContainText(uniqueText);
  });
});
