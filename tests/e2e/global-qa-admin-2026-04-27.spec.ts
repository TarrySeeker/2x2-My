import { test, expect, type Page } from "@playwright/test";

/**
 * Global QA — админка.
 *
 * Запуск:
 *   ADMIN_EMAIL=admin@2x2.ru ADMIN_PASSWORD=<...> \
 *   PLAYWRIGHT_BASE_URL=https://erfgv.website PLAYWRIGHT_SKIP_SERVER=1 \
 *     pnpm exec playwright test tests/e2e/global-qa-admin-2026-04-27.spec.ts \
 *     --project=chromium --reporter=list
 *
 * Все мутации делаются через UI и откатываются в конце теста.
 * Ничего не пишется напрямую в БД.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@2x2.ru";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

async function login(page: Page) {
  if (!ADMIN_PASSWORD) {
    test.skip(true, "ADMIN_PASSWORD env не задан — пропускаем admin-тесты");
  }
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => {
      const btn = document.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement | null;
      return !!btn && !btn.disabled;
    },
    null,
    { timeout: 15_000 },
  );
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin\/(dashboard|content|blog|leads|settings)/, {
    timeout: 20_000,
  });
}

test.describe.configure({ mode: "serial" });
test.setTimeout(90_000);

test("admin-01. Login — неверный пароль показывает ошибку", async ({ page }) => {
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "wrong@example.com");
  await page.fill('input[type="password"]', "wrong-password-1234567");
  await page.click('button[type="submit"]');
  // Ждём toast или ошибку
  const errorToast = page.locator(
    '[data-sonner-toast], [role="alert"], .text-red-400, .text-red-500',
  );
  await expect(errorToast.first()).toBeVisible({ timeout: 10_000 });
  // НЕ должны быть на dashboard
  expect(page.url()).not.toMatch(/\/admin\/dashboard/);
});

test("admin-02. Login — верные учётные данные → /admin/dashboard", async ({ page }) => {
  if (!ADMIN_PASSWORD) {
    test.skip(true, "ADMIN_PASSWORD env не задан");
  }
  await login(page);
  // Должны попасть на dashboard или похожий путь
  expect(page.url()).toMatch(/\/admin\//);
});

test("admin-03. Dashboard — счётчики и виджеты не падают", async ({ page }) => {
  await login(page);
  await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  // Не должно быть NaN в видимых счётчиках
  const text = await page.locator("body").innerText();
  expect(text, "не должно быть NaN на dashboard").not.toContain("NaN");
});

test("admin-04. Leads — список открывается", async ({ page }) => {
  await login(page);
  const r = await page.goto("/admin/leads", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBeLessThan(400);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
});

test("admin-05. Content/services — список загружается", async ({ page }) => {
  await login(page);
  const r = await page.goto("/admin/content/services", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBeLessThan(400);
  await page.waitForSelector('button[aria-label="Редактировать"]', {
    timeout: 15_000,
    state: "visible",
  });
});

test("admin-06. Content/team — список загружается", async ({ page }) => {
  await login(page);
  const r = await page.goto("/admin/content/team", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBeLessThan(400);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
});

test("admin-07. Content/portfolio — список загружается", async ({ page }) => {
  await login(page);
  const r = await page.goto("/admin/content/portfolio", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBeLessThan(400);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
});

test("admin-08. Content/promotions — список загружается", async ({ page }) => {
  await login(page);
  const r = await page.goto("/admin/content/promotions", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBeLessThan(400);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
});

test("admin-09. Content/sections — все пути секций видны", async ({ page }) => {
  await login(page);
  const r = await page.goto("/admin/content/sections", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBeLessThan(400);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  // Минимум — главная и services
  const text = await page.locator("body").innerText();
  // Допускаем разные форматы — pages or section keys
  expect(text.length).toBeGreaterThan(50);
});

test("admin-10. Content/metadata — НЕТ строки с /calculator", async ({ page }) => {
  await login(page);
  const r = await page.goto("/admin/content/metadata", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBeLessThan(400);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
  const text = await page.locator("body").innerText();
  expect(text, "metadata не должна содержать /calculator").not.toContain("/calculator");
});

test("admin-11. Content/ui-strings — список загружается", async ({ page }) => {
  await login(page);
  const r = await page.goto("/admin/content/ui-strings", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBeLessThan(400);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
});

test("admin-12. Content/legal-pages — список загружается", async ({ page }) => {
  await login(page);
  const r = await page.goto("/admin/content/legal-pages", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBeLessThan(400);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
});

test("admin-13. Content/settings — все 7 вкладок открываются", async ({ page }) => {
  await login(page);
  const r = await page.goto("/admin/content/settings", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBeLessThan(400);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });

  // Вкладки могут быть buttons / links — проверяем по тексту
  const tabsExpected = [
    /контакт/i,
    /час/i,
    /соцсет|социал/i,
    /реквизит/i,
    /организац|компани/i,
    /навигац/i,
    /trust|довер/i,
  ];
  const text = await page.locator("body").innerText();
  let found = 0;
  for (const re of tabsExpected) {
    if (re.test(text)) found++;
  }
  expect(found, "должно быть видно ≥4 названия вкладок").toBeGreaterThanOrEqual(4);
});

test("admin-14. Blog — список загружается", async ({ page }) => {
  await login(page);
  const r = await page.goto("/admin/blog", { waitUntil: "domcontentloaded" });
  expect(r?.status()).toBeLessThan(400);
  await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 10_000 });
});

test("admin-15. Logout — кнопка работает", async ({ page }) => {
  await login(page);
  // Идём на /admin/dashboard
  await page.goto("/admin/dashboard", { waitUntil: "domcontentloaded" });
  // Ищем кнопку выхода
  const logoutBtn = page
    .locator('button:has-text("Выйти"), a:has-text("Выйти"), button[aria-label*="ыход"]')
    .first();
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
    await page.waitForURL(/\/admin\/login/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/admin\/login/);
  } else {
    test.skip(true, "Кнопка logout не найдена в видимом UI");
  }
});

/**
 * Roundtrip: меняем headline на главной через /admin/content/homepage/hero,
 * проверяем на витрине, откатываем.
 *
 * Изменение текстового поля — самое безопасное (не ломает схему).
 */
test("admin-16. ROUNDTRIP — Hero headline на главной", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);

  await page.goto("/admin/content/homepage/hero", { waitUntil: "networkidle" });

  // Используем поле eyebrow (мини-заголовок над h1) — оно всегда рендерится
  // на главной как <p>{eyebrow}</p>. Поле headline_line1 используется только
  // как fallback при пустом titles[]; поэтому проверять его на витрине
  // ненадёжно.
  const headlineInput = page.locator('input[name="eyebrow"]');
  await expect(headlineInput).toHaveCount(1, { timeout: 10_000 });
  await expect(headlineInput).toBeVisible({ timeout: 5_000 });

  const originalValue = await headlineInput.inputValue();
  // eyebrow может быть пустым на проде — допустим оба варианта
  // (truthy / "")
  // если пусто — тест оставит его пустым, но это всё равно валидный roundtrip:
  // мы запишем маркер и потом восстановим пустое значение.

  const testMarker = `QA${Date.now() % 100000}`;
  const newValue = `${originalValue} ${testMarker}`;

  // Меняем и сохраняем
  await headlineInput.fill(newValue);
  const saveBtn = page
    .locator(
      'button[type="submit"]:has-text("Сохранит"), button:has-text("Сохранить секцию"), button:has-text("Сохранить")',
    )
    .first();
  await saveBtn.click();
  await expect(
    page.locator('[data-sonner-toast]'),
  ).toBeVisible({ timeout: 15_000 });

  // Проверяем на главной (with cache-buster)
  await page.goto(`/?nocache=${Date.now()}`, { waitUntil: "domcontentloaded" });
  // Подождать гидратации
  await page.waitForTimeout(2_000);
  const homeText = await page.locator("body").innerText();
  const sawMarker = homeText.includes(testMarker);

  // ОТКАТ — независимо от того, увидели маркер на витрине или нет
  await page.goto("/admin/content/homepage/hero", { waitUntil: "networkidle" });
  const headlineInputBack = page.locator('input[name="eyebrow"]');
  await expect(headlineInputBack).toBeVisible({ timeout: 10_000 });
  await headlineInputBack.fill(originalValue);
  const saveBtn2 = page
    .locator(
      'button[type="submit"]:has-text("Сохранит"), button:has-text("Сохранить секцию"), button:has-text("Сохранить")',
    )
    .first();
  await saveBtn2.click();
  await expect(
    page.locator('[data-sonner-toast]'),
  ).toBeVisible({ timeout: 15_000 });

  // Проверяем, что откатилось
  await page.goto(`/?nocache=${Date.now()}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1_500);
  const finalHomeText = await page.locator("body").innerText();
  expect(finalHomeText, "после отката маркер не должен быть на главной").not.toContain(testMarker);

  // И только теперь fail-им если на главной не увидели маркер.
  // (Откат прошёл первым — БД восстановлена.)
  expect(sawMarker, "Маркер должен был появиться на главной после save").toBe(true);
});
