import { test, expect } from "@playwright/test";

/**
 * E2E (Этап 7): admin-orders → admin-leads.
 *
 * Заказы (orders) удалены в Этапе 1 (master-plan правка 9, миграция 006
 * DROP TABLE orders/order_items). Раздел /admin/orders теперь редиректит
 * на /admin/leads (см. app/admin/orders/page.tsx).
 *
 * Этот файл сохранён для обратной совместимости git-history. Все тесты
 * перешли в `admin-leads.spec.ts` (новый), который проверяет работу с
 * `leads`, `calculation_requests`, `contact_requests`.
 */

test.describe("Admin Orders — DEPRECATED → /admin/leads", () => {
  test("/admin/orders редиректит на /admin/leads", async ({ page }) => {
    const response = await page.goto("/admin/orders");
    // Ожидаем 200/302 — реальный URL после редиректа = /admin/leads ИЛИ /admin/login
    // (если пользователь не залогинен).
    expect(response?.status()).toBeLessThan(500);
    const finalUrl = page.url();
    expect(finalUrl).toMatch(/\/admin\/(leads|login)/);
  });
});

test.describe("Admin Customers — DEPRECATED", () => {
  test.skip(true, "Раздел customers отключён вместе с orders");
});
