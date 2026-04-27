import { test, expect, type Page } from "@playwright/test";

/**
 * Regression-тесты для H4 (см. 006-from-marketer): trackEvent() должен
 * вызываться в ключевых точках витрины. Без NEXT_PUBLIC_YM_ID / GA4_ID
 * обёртка логирует через `console.info("[analytics]", name, params)`,
 * мы слушаем эти логи и проверяем, что нужное событие вылетело.
 *
 * R-003 fix (D-114): trackEvent внедрён в 12 точках. Fixme сняты для
 * phone_click, one_click_submit, view_product. whatsapp_click остаётся
 * fixme — WA-ссылки ещё не добавлены в компоненты.
 */

async function collectAnalytics(page: Page): Promise<string[]> {
  const events: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "info") return;
    const txt = msg.text();
    if (txt.startsWith("[analytics]")) {
      // Форматы: "[analytics] phone_click {...}" или "[analytics] phone_click {}"
      const parts = txt.split(" ");
      if (parts[1]) events.push(parts[1]);
    }
  });
  return events;
}

test("H4 — клик по телефону в хедере дёргает trackEvent('phone_click')", async ({ page }) => {
  const events = await collectAnalytics(page);
  await page.goto("/");
  const phoneLink = page.locator('a[href^="tel:"]').first();
  await phoneLink.evaluate((el) => (el as HTMLElement).click());
  expect(events).toContain("phone_click");
});

test.fixme("H4 — клик по WhatsApp дёргает trackEvent('whatsapp_click')", async ({ page }) => {
  // WhatsApp/Telegram ссылки ещё не добавлены в компоненты (ждём данные от клиента)
  const events = await collectAnalytics(page);
  await page.goto("/");
  const wa = page.locator('a[href*="wa.me"]').first();
  await wa.evaluate((el) => (el as HTMLElement).click());
  expect(events).toContain("whatsapp_click");
});

// Тесты one_click_submit и view_product завязаны на /product/[slug],
// которого больше нет (chore(catalog) 2026-04-26). OneClickModal сейчас
// не вызывается с витрины — все CTA идут в QuoteModal, и она покрыта
// leads-flow.spec.ts. Когда OneClick вернётся (например, на странице
// услуги), нужно добавить аналогичный тест с актуальным роутом.
