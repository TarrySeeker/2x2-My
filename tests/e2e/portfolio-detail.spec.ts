import { test, expect, type Page } from "@playwright/test";

/**
 * Регрессия: после клика по карточке портфолио должна открыться
 * страница работы (/portfolio/[slug]) — не 404 и не «черный экран».
 *
 * До 2026-04-27 страницы /portfolio/[slug] не существовало:
 *  - На главной (PortfolioPreviewClient) карточки имели <Link
 *    href={`/portfolio/${slug}`}>, который вёл в 404 с тёмным фоном
 *    error-page (клиент описывал как «черный экран»).
 *  - На /portfolio (PortfolioGallery) карточки были обычными <div>,
 *    клики не работали вовсе.
 *
 * Этот тест проверяет flow с /portfolio: первая карточка → клик →
 * URL содержит /portfolio/<slug> → status 200 → есть <h1> с title.
 */

async function attachConsoleCollector(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

test.describe("Портфолио — страница работы /portfolio/[slug]", () => {
  test("клик по карточке на /portfolio открывает детальную страницу", async ({
    page,
  }) => {
    const errors = await attachConsoleCollector(page);

    // /portfolio: PortfolioGallery рендерит сетку карточек, обёрнутых
    // в <Link>. Берём первую карточку.
    await page.goto("/portfolio", { waitUntil: "networkidle" });

    // На случай, если popup-промо перекрыл viewport — закрываем его.
    const promo = page.getByRole("dialog", { name: /подарок|визиток/i });
    if ((await promo.count()) > 0) {
      await promo
        .first()
        .getByRole("button", { name: /закрыть/i })
        .first()
        .click({ timeout: 2000 })
        .catch(() => page.keyboard.press("Escape"));
    }

    // Selector: карточка-ссылка с aria-label «Открыть проект: …». Этот
    // aria-label мы добавили специально для тестов и accessibility.
    const firstCard = page
      .locator('a[aria-label^="Открыть проект:"]')
      .first();
    await expect(firstCard).toBeVisible();

    // Запоминаем title карточки до клика — потом сравниваем с h1 на детали.
    const cardTitle = (await firstCard.getAttribute("aria-label")) ?? "";
    const expectedTitle = cardTitle.replace(/^Открыть проект:\s*/u, "").trim();

    const [response] = await Promise.all([
      page.waitForResponse((r) =>
        r.url().includes("/portfolio/") && r.url() !== "/portfolio",
      ),
      firstCard.click(),
    ]);

    expect(response.status(), `unexpected status for ${response.url()}`).toBe(
      200,
    );

    await expect(page).toHaveURL(/\/portfolio\/[a-z0-9-]+$/);

    // На детали должен быть h1 (рендерится ServicesHero внутри).
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
    if (expectedTitle) {
      // Допускаем, что title будет урезанный/нормализованный — проверяем
      // содержание первых нескольких слов.
      const firstWord = expectedTitle.split(/\s+/)[0]!;
      await expect(heading).toContainText(firstWord);
    }

    expect(errors, `console errors: ${errors.join("\n")}`).toEqual([]);
  });
});
