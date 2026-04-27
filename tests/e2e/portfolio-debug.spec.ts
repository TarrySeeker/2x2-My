import { test, expect, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@2x2.ru";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

async function login(page: Page) {
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
  await page.waitForURL(/\/admin\/(dashboard|content|blog)/, {
    timeout: 20_000,
  });
}

test("DEBUG: portfolio category save persistence", async ({ page }) => {
  test.setTimeout(120_000);
  await login(page);

  await page.goto("/admin/content/portfolio", { waitUntil: "networkidle" });
  await page.waitForSelector('button[aria-label="Редактировать"]', {
    timeout: 15_000,
    state: "visible",
  });

  // Слушаем все network-запросы.
  page.on("response", async (resp) => {
    const url = resp.url();
    if (url.includes("admin/content/portfolio") || url.includes("server-action")) {
      console.log(
        `[net] ${resp.request().method()} ${resp.status()} ${url.slice(0, 100)}`,
      );
    }
  });

  // Открываем первую работу.
  const editBtn = page.locator('button[aria-label="Редактировать"]').first();
  await editBtn.click({ force: true });
  await expect(page.locator("text=Редактировать работу")).toBeVisible({
    timeout: 8_000,
  });

  // Читаем текущее значение
  const currentValue = await page
    .locator('select[name="category_label"]')
    .inputValue();
  console.log(`[debug] current value: "${currentValue}"`);

  // Читаем все опции
  const options = await page.locator('select[name="category_label"] option').allTextContents();
  console.log(`[debug] options:`, options);

  // Выбираем "Полиграфия"
  await page.locator('select[name="category_label"]').selectOption("Полиграфия");
  const afterSelect = await page
    .locator('select[name="category_label"]')
    .inputValue();
  console.log(`[debug] value after selectOption: "${afterSelect}"`);

  // Сабмитим
  await page.click('button[type="submit"]:has-text("Сохранить")');
  await expect(
    page.locator('[data-sonner-toast]:has-text("Работа обновлена")'),
  ).toBeVisible({ timeout: 8_000 });
  await expect(page.locator("text=Редактировать работу")).toBeHidden({
    timeout: 5_000,
  });
  console.log(`[debug] save toast appeared, dialog closed`);

  // Сразу открываем снова без перехода
  await page
    .locator('button[aria-label="Редактировать"]')
    .first()
    .click({ force: true });
  await expect(page.locator("text=Редактировать работу")).toBeVisible({
    timeout: 8_000,
  });
  await page.waitForTimeout(800);
  const reopenedValue = await page
    .locator('select[name="category_label"]')
    .inputValue();
  console.log(`[debug] after re-open (no nav): "${reopenedValue}"`);

  // Закрываем диалог
  await page.locator('button[aria-label="Закрыть"]').first().click();
  await expect(page.locator("text=Редактировать работу")).toBeHidden({
    timeout: 5_000,
  });

  // Полностью перезагружаем страницу
  await page.goto("/admin/content/portfolio", { waitUntil: "networkidle" });
  await page.waitForSelector('button[aria-label="Редактировать"]', {
    timeout: 15_000,
    state: "visible",
  });
  await page
    .locator('button[aria-label="Редактировать"]')
    .first()
    .click({ force: true });
  await expect(page.locator("text=Редактировать работу")).toBeVisible({
    timeout: 8_000,
  });
  await page.waitForTimeout(800);
  const afterReloadValue = await page
    .locator('select[name="category_label"]')
    .inputValue();
  console.log(`[debug] after full reload: "${afterReloadValue}"`);

  // ОТКАТ — поставим обратно ""
  await page.locator('select[name="category_label"]').selectOption("");
  await page.click('button[type="submit"]:has-text("Сохранить")');
  await expect(
    page.locator('[data-sonner-toast]:has-text("Работа обновлена")'),
  ).toBeVisible({ timeout: 8_000 });
});
