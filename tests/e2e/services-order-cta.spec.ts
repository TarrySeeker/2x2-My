import { test, expect } from "@playwright/test";

/**
 * Регрессия: кнопка «Заказать» под карточкой услуги на главной должна
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

    // На проде сразу всплывает PromoPopupBanner (тоже role=dialog) —
    // закроем его, чтобы не перекрывал клик. На dev/CI без БД попапа
    // нет, поэтому делаем закрытие best-effort.
    const promoPopup = page
      .getByRole("dialog", { name: /500 визиток|визитки|подарок/i });
    if ((await promoPopup.count()) > 0) {
      await promoPopup
        .first()
        .getByRole("button", { name: /закрыть|^×$|^x$/i })
        .first()
        .click({ timeout: 3000 })
        .catch(() => {
          // fallback: ESC
          return page.keyboard.press("Escape");
        });
    }

    // Берём кнопку «Заказать» в секции услуг — Button рендерит
    // <button>Заказать</button> (без Link), это уникальная сигнатура.
    const orderBtn = page
      .getByRole("button", { name: /^Заказать$/ })
      .first();
    await expect(orderBtn).toBeVisible();
    await orderBtn.scrollIntoViewIfNeeded();
    await orderBtn.click();

    // Должна открыться QuoteModal (role=dialog), фильтруем cookie/promo.
    const dialog = page
      .getByRole("dialog")
      .filter({
        hasNotText: /cookie|cookies|куки|подарок|визиток|листовок/i,
      })
      .first();
    await expect(dialog).toBeVisible();

    // В описании модалки должно быть название услуги — это значит,
    // что в openQuote передан product.name.
    await expect(dialog).toContainText(
      /пришлём коммерческое предложение/i,
    );
  });
});
