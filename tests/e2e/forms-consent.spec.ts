import { test, expect, type Page, type Locator } from "@playwright/test";

/**
 * E2E (Этап 7): согласие на обработку ПД (152-ФЗ) обязательно
 * во ВСЕХ формах витрины (master-plan правка C.security).
 *
 * Покрываем: QuoteModal (Hero CTA), OneClickModal (карточка товара),
 * ContactForm (/contacts).
 *
 * Цель: убедиться что без чекбокса submit blocked, а с чекбоксом —
 * в body уходит pdConsent:true и есть Idempotency-Key в headers.
 */

async function findConsentCheckbox(scope: Page | Locator) {
  return scope.getByRole("checkbox", {
    name: /политикой|персональных данных|обработк|конфиденциальност/i,
  });
}

test.describe("ContactForm на /contacts", () => {
  test("без чекбокса — submit не вызывает /api/contact", async ({ page }) => {
    await page.goto("/contacts");
    await page.getByLabel(/имя/i).first().fill("Тестер");
    await page.getByLabel(/телефон/i).first().fill("+79324247740");
    await page.getByLabel(/задач|сообщен/i).first().fill("Тестовое сообщение");

    let called = false;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/contact")) called = true;
    });

    // force:true — на WebKit/Mobile Safari кнопка помечена disabled, но
    // Playwright actionability check ведёт себя нестабильно. Нам важно
    // проверить именно то, что даже принудительный клик не уходит в API —
    // это даёт нам client-side защита в onSubmit (early return на !consent).
    await page
      .getByRole("button", { name: /отправит|оставить/i })
      .click({ force: true });
    await page.waitForTimeout(400);
    expect(called).toBe(false);
  });

  test("с чекбоксом — submit отправляет pdConsent:true + Idempotency-Key", async ({ page }) => {
    await page.goto("/contacts");
    await page.getByLabel(/имя/i).first().fill("Тестер");
    await page.getByLabel(/телефон/i).first().fill("+79324247740");
    await page.getByLabel(/задач|сообщен/i).first().fill("Тестовое сообщение");

    const consent = await findConsentCheckbox(page);
    await consent.check();

    const reqP = page.waitForRequest(
      (r) => r.url().endsWith("/api/contact") && r.method() === "POST",
    );
    await page.getByRole("button", { name: /отправит|оставить/i }).click();
    const req = await reqP;
    const body = req.postDataJSON();
    expect(body).toMatchObject({ pdConsent: true });
    expect(req.headers()["idempotency-key"]).toBeTruthy();
  });
});

test.describe("OneClickModal на /product/[slug]", () => {
  test("без чекбокса submit заблокирован, с чекбоксом — POST в /api/leads/one-click", async ({ page }) => {
    await page.goto("/product/vizitki-90x50");
    const trigger = page.getByRole("button", { name: /в 1 клик|купить в 1 клик|быстрый расчёт/i }).first();
    if ((await trigger.count()) === 0) {
      test.skip(true, "Кнопка OneClick не найдена на этом продукте");
      return;
    }
    await trigger.click();

    // Cookie banner тоже role="dialog" — фильтруем.
    const dialog = page
      .getByRole("dialog")
      .filter({ hasNotText: /cookie|cookies|куки/i })
      .first();
    await dialog.getByLabel(/имя/i).first().fill("Тестер");
    await dialog.getByLabel(/телефон/i).first().fill("+79324247740");

    // Без consent — не отправляется (force:true — см. комментарий в
    // ContactForm-тесте: на WebKit actionability для disabled работает
    // нестабильно, важно проверить именно защиту onSubmit, а не UI-блок).
    let called = false;
    page.on("request", (r) => {
      if (r.url().endsWith("/api/leads/one-click")) called = true;
    });
    await dialog
      .getByRole("button", { name: /отправить|оставить/i })
      .click({ force: true });
    await page.waitForTimeout(300);
    expect(called).toBe(false);

    // Ставим consent
    const consent = await findConsentCheckbox(dialog);
    await consent.check();

    const reqP = page.waitForRequest(
      (r) => r.url().endsWith("/api/leads/one-click") && r.method() === "POST",
    );
    await dialog.getByRole("button", { name: /отправить|оставить/i }).click();
    const req = await reqP;
    const body = req.postDataJSON();
    expect(body).toMatchObject({ pdConsent: true });
    expect(req.headers()["idempotency-key"]).toBeTruthy();
    // НЕ /api/orders (которая теперь 410)
    expect(req.url()).not.toContain("/api/orders");
  });
});

test.describe("QuoteModal — pdConsent contract", () => {
  test("body содержит pdConsent:true и Idempotency-Key в header", async ({ page }) => {
    await page.goto("/");
    const heroCta = page.getByRole("button", { name: /Получить расчёт|Заказать/i }).first();
    await heroCta.click();
    const dialog = page
      .getByRole("dialog")
      .filter({ hasNotText: /cookie|cookies|куки/i })
      .first();
    await dialog.getByLabel(/имя/i).first().fill("E2E");
    await dialog.getByLabel(/телефон/i).first().fill("+79324247740");
    const consent = await findConsentCheckbox(dialog);
    await consent.check();

    const reqP = page.waitForRequest(
      (r) => r.url().endsWith("/api/leads/quote") && r.method() === "POST",
    );
    await dialog.getByRole("button", { name: /отправить|оставить заявк/i }).click();
    const req = await reqP;
    const body = req.postDataJSON();
    expect(body.pdConsent).toBe(true);
    expect(req.headers()["idempotency-key"]).toMatch(
      /[A-Za-z0-9._\-:]{8,}/,
    );
  });
});
