import { test, expect } from "@playwright/test";

/**
 * Регрессия: /calculator должен 308-редиректом уезжать на /services.
 *
 * Контекст (chore(calculator) 2026-04-27): онлайн-калькулятор удалён,
 * все услуги «2х2» — по индивидуальному расчёту через QuoteModal.
 * Редирект 308 (permanent) сохраняет SEO-вес внешних ссылок на
 * /calculator. Конфигурация — next.config.ts → redirects().
 *
 * По аналогии с уже существующим catalog-cleanup'ом (см. коммит
 * 059c23a) и тестом services-order-cta.spec.ts.
 */
test.describe("/calculator → 308 → /services", () => {
  test("редирект 308 с корректным Location", async ({ request }) => {
    // maxRedirects: 0 — нужен сам ответ редиректа, не финальная страница.
    const response = await request.get("/calculator", {
      maxRedirects: 0,
    });

    // Next.js permanent: true → 308 (Permanent Redirect)
    expect(response.status()).toBe(308);

    const location = response.headers()["location"];
    expect(location).toBeTruthy();
    // Location может быть относительным или абсолютным —
    // главное, чтобы заканчивался на /services.
    expect(location).toMatch(/\/services$/);
  });

  test("браузер по /calculator оказывается на /services с 200", async ({ page }) => {
    const response = await page.goto("/calculator", {
      waitUntil: "domcontentloaded",
    });

    // Финальный URL после редиректа
    expect(page.url()).toMatch(/\/services\/?$/);

    // Финальная страница рабочая
    expect(response?.status()).toBe(200);
  });
});
