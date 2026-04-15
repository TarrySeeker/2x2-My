import { test, expect, type Page } from "@playwright/test";

/**
 * Smoke-проверки публичных страниц Этапа 1.
 * Цель: убедиться, что каждая страница рендерится без JS-ошибок,
 * не отдаёт 500, содержит ожидаемые маркеры контента.
 */

const PAGES = [
  { path: "/", title: /2х2|Ханты-Мансийск|рекламн/i },
  { path: "/services", title: /услуг/i },
  { path: "/portfolio", title: /портфолио|работы/i },
  { path: "/about", title: /о компании|2х2/i },
  { path: "/contacts", title: /контакт/i },
  { path: "/faq", title: /вопрос|faq/i },
];

async function attachConsoleCollector(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  return errors;
}

for (const { path, title } of PAGES) {
  test(`public page ${path} renders without JS errors`, async ({ page }) => {
    const errors = await attachConsoleCollector(page);
    const response = await page.goto(path, { waitUntil: "networkidle" });
    expect(response, `navigation to ${path} returned no response`).toBeTruthy();
    expect(response!.status(), `status for ${path}`).toBeLessThan(400);

    // Заголовок соответствует ожиданиям
    await expect(page).toHaveTitle(title);

    // На странице есть <main> или хотя бы один h1 (accessible landmark smoke)
    const main = page.locator("main, [role='main']");
    const h1 = page.locator("h1");
    const hasMain = (await main.count()) > 0;
    const hasH1 = (await h1.count()) > 0;
    expect(hasMain || hasH1, `${path} должен содержать <main> или <h1>`).toBe(true);

    // На всех страницах — видимый телефон/email/footer
    await expect(page.locator("footer")).toBeVisible();

    expect(errors, `JS errors on ${path}`).toEqual([]);
  });
}

test("header and footer mount on /", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
});

test("no Yandex.Metrika script injected without NEXT_PUBLIC_YM_ID", async ({
  page,
}) => {
  await page.goto("/");
  const html = await page.content();
  // Если YM_ID в env не задан — ни одного обращения к mc.yandex.ru быть не должно
  if (!process.env.NEXT_PUBLIC_YM_ID) {
    expect(html).not.toContain("mc.yandex.ru");
  }
});

test("no GA4 script injected without NEXT_PUBLIC_GA4_ID", async ({ page }) => {
  await page.goto("/");
  const html = await page.content();
  if (!process.env.NEXT_PUBLIC_GA4_ID) {
    expect(html).not.toContain("googletagmanager.com");
  }
});

test("404 для несуществующего маршрута отдаёт Not Found", async ({ page }) => {
  const response = await page.goto("/nonexistent-page-slug-404");
  expect(response?.status()).toBe(404);
});
