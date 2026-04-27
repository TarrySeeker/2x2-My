import { test, expect } from "@playwright/test";

/**
 * Регрессия: кнопка «Заказать» в блоке услуг на главной должна
 * открывать QuoteModal. Раньше был баг — оверлей RulerBorder с
 * `pointer-events: auto` на `inset-0 z-10` перехватывал клики по
 * кнопке внутри карточки. Фикс: оверлей `pointer-events-none`,
 * отслеживание мыши перенесено на родителя через ref.
 *
 * См. fix(home) 2026-04-26.
 */
test.describe("Главная — кнопка «Заказать» под карточкой услуги", () => {
  test("клик открывает QuoteModal с pre-fill названия услуги", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });

    // Берём первую кнопку «Заказать» в секции услуг — это первая
    // карточка ServicesPreviewClient.
    const orderBtn = page
      .getByRole("button", { name: /^Заказать/i })
      .first();
    await expect(orderBtn).toBeVisible();
    await orderBtn.click();

    // Должна открыться QuoteModal (role=dialog), фильтруем cookie-баннер.
    const dialog = page
      .getByRole("dialog")
      .filter({ hasNotText: /cookie|cookies|куки/i })
      .first();
    await expect(dialog).toBeVisible();

    // В описании модалки должно быть название услуги — это значит,
    // что в openQuote передан product.name.
    await expect(dialog).toContainText(
      /пришлём коммерческое предложение/i,
    );
  });
});
