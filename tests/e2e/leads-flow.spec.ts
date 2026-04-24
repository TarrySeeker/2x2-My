import { test, expect } from "@playwright/test";

/**
 * E2E (Этап 7): новый поток заявок через QuoteModal (заменяет старый
 * cart→checkout, master-plan правка 9).
 *
 * Шаги:
 *  1. Главная → клик по «Получить расчёт» (Hero CTA)
 *  2. Заполнить QuoteModal (имя, телефон, опциональный email и комментарий)
 *  3. Поставить чекбокс согласия на ПД
 *  4. Submit → success toast + закрытие модалки
 *  5. (Опц., если есть admin-сессия) — открыть /admin/leads, увидеть
 *     новую заявку в верху списка
 *
 * Требует:
 *  - запущенный dev server (docker compose dev OR локальный pnpm dev)
 *  - доступную БД с миграцией 006
 *  - mock /api/leads/quote → 200 (если БД нет)
 */

test.describe("Leads flow — QuoteModal через Hero CTA", () => {
  test("Главная → Получить расчёт → Submit с pdConsent → success", async ({ page }) => {
    await page.goto("/");

    // Кнопка "Получить расчёт" в Hero — её label из CMS hero.cta_primary_text.
    const heroCta = page
      .getByRole("button", { name: /Получить расчёт|Заказать|Рассчитать/i })
      .first();
    await expect(heroCta).toBeVisible();
    await heroCta.click();

    // QuoteModal — диалог. Cookie banner тоже role="dialog" — фильтруем.
    const dialog = page
      .getByRole("dialog")
      .filter({ hasNotText: /cookie|cookies|куки/i })
      .first();
    await expect(dialog).toBeVisible();

    await page.getByLabel(/имя/i).first().fill("E2E Тестер");
    await page.getByLabel(/телефон/i).first().fill("+7 932 424 77 40");

    // Поставить чекбокс согласия на ПД
    const consent = page.getByRole("checkbox", {
      name: /политикой|персональных данных|обработк/i,
    });
    await consent.check();
    await expect(consent).toBeChecked();

    // Перехватываем POST /api/leads/quote, проверяем pdConsent + Idempotency-Key
    const requestPromise = page.waitForRequest(
      (req) =>
        req.url().endsWith("/api/leads/quote") && req.method() === "POST",
    );

    await page.getByRole("button", { name: /отправить|оставить заявк/i }).click();

    const req = await requestPromise;
    const body = req.postDataJSON();
    expect(body).toMatchObject({ pdConsent: true });
    expect(req.headers()["idempotency-key"]).toBeTruthy();

    // Toast появится на «success»
    await expect(
      page.locator("[data-sonner-toast], [role='status']").filter({
        hasText: /заявк|спасибо|отправ/i,
      }),
    ).toBeVisible({ timeout: 5000 });
  });

  test.skip("Заявка появляется в /admin/leads после логина", async () => {
    // Skip — требует залогинен админ. См. admin-login.spec.ts для шаблона.
  });
});

test.describe("Leads flow — submit без pdConsent блокируется", () => {
  test("submit без чекбокса не отправляется", async ({ page }) => {
    await page.goto("/");

    const heroCta = page.getByRole("button", { name: /Получить расчёт|Заказать/i }).first();
    await heroCta.click();

    const dialog = page
      .getByRole("dialog")
      .filter({ hasNotText: /cookie|cookies|куки/i })
      .first();
    await expect(dialog).toBeVisible();

    await page.getByLabel(/имя/i).first().fill("Тестер");
    await page.getByLabel(/телефон/i).first().fill("+79324247740");
    // Чекбокс НЕ ставим.

    let networkCalled = false;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/leads/quote")) networkCalled = true;
    });

    await page.getByRole("button", { name: /отправить|оставить заявк/i }).click();

    // Дать времени на promise-цепочку
    await page.waitForTimeout(300);
    expect(networkCalled).toBe(false);

    // Должна появиться ошибка про согласие
    await expect(
      dialog.locator("text=/согласие|персональн/i"),
    ).toBeVisible();
  });
});
