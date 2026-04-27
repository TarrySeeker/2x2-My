import { test, expect, type Page } from "@playwright/test";

/**
 * E2E: проверяем редактирование категории работы портфолио в админке.
 *
 * Жалоба клиента (по аналогии с услугами): «Категория (label)» в
 * /admin/content/portfolio была свободным текстовым input'ом, и любая
 * опечатка / произвольная категория → карточка не попадает ни в один
 * фильтр на витрине /portfolio.
 *
 * ВАЖНО про данные: в проде таблица `portfolio_items` может быть пустой,
 * и тогда на /admin/content/portfolio показываются ряды-заглушки из
 * `data/portfolio-stub.ts`. У них захардкоженные id, и UPDATE по такому id
 * ничего не пишет в БД (silent no-op). Поэтому тест НЕ работает с
 * существующими карточками — он сам создаёт временную работу,
 * проверяет roundtrip категории и удаляет её в конце.
 *
 * Шаги:
 *   1. Логин как admin@2x2.ru
 *   2. /admin/content/portfolio → «Добавить работу»
 *   3. Заполнить минимум полей + категорию «Полиграфия» → Сохранить
 *   4. Открыть на редактирование → select показывает «Полиграфия»
 *      (доказывает persistence)
 *   5. Сменить на «Наружная реклама», сохранить, открыть → проверить
 *   6. Сменить на «Фасады», сохранить, открыть → проверить
 *   7. Удалить созданную работу (clean-up)
 *
 * Учётные данные:
 *   ADMIN_EMAIL=admin@2x2.ru
 *   ADMIN_PASSWORD=<...>
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@2x2.ru";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

// Уникальные значения для тестовой работы.
const TEST_TITLE = `__qa-portfolio-category-${Date.now()}`;
const TEST_SLUG = `qa-portfolio-category-${Date.now()}`;
// cover_url валидируется как путь/URL (min(1).max(2048)).
// Используем существующий путь из public/.
const TEST_COVER = "/port/print-visiting-cards-catalogs.png";

async function login(page: Page) {
  if (!ADMIN_PASSWORD) {
    test.skip(true, "ADMIN_PASSWORD env not set");
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
  await page.waitForURL(/\/admin\/(dashboard|content|blog)/, {
    timeout: 20_000,
  });
}

async function gotoPortfolioAdmin(page: Page) {
  await page.goto("/admin/content/portfolio", { waitUntil: "networkidle" });
  await page.waitForSelector(
    'button[aria-label="Редактировать"], text=Добавить работу',
    { timeout: 15_000 },
  );
}

async function fillCreateForm(page: Page) {
  await page.click("text=Добавить работу");
  await expect(page.locator("text=Новая работа")).toBeVisible({
    timeout: 8_000,
  });

  await page.fill('input[name="title"]', TEST_TITLE);
  await page.fill('input[name="slug"]', TEST_SLUG);
  await page.fill('input[name="cover_url"]', TEST_COVER);
  await page
    .locator('select[name="category_label"]')
    .selectOption("Полиграфия");

  await page.click('button[type="submit"]:has-text("Сохранить")');
  await expect(
    page.locator('[data-sonner-toast]:has-text("Работа создана")'),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("text=Новая работа")).toBeHidden({
    timeout: 5_000,
  });
}

async function openEditByTitle(page: Page, title: string) {
  const row = page
    .locator('div:has(button[aria-label="Редактировать"])')
    .filter({ hasText: title })
    .first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.scrollIntoViewIfNeeded();
  await row
    .locator('button[aria-label="Редактировать"]')
    .first()
    .click({ force: true });
  await expect(page.locator("text=Редактировать работу")).toBeVisible({
    timeout: 8_000,
  });
}

async function readCategoryFromOpenDialog(page: Page): Promise<string> {
  await page.waitForFunction(
    () => {
      const sel = document.querySelector(
        'select[name="category_label"]',
      ) as HTMLSelectElement | null;
      return !!sel;
    },
    null,
    { timeout: 5_000 },
  );
  // RHF использует `values` prop для синхронизации defaultValues после
  // первого рендера; даём кадр на reset.
  await page.waitForTimeout(300);
  return await page.locator('select[name="category_label"]').inputValue();
}

async function changeCategoryAndSave(page: Page, value: string) {
  await page.locator('select[name="category_label"]').selectOption(value);
  await page.click('button[type="submit"]:has-text("Сохранить")');
  await expect(
    page.locator('[data-sonner-toast]:has-text("Работа обновлена")'),
  ).toBeVisible({ timeout: 8_000 });
  await expect(page.locator("text=Редактировать работу")).toBeHidden({
    timeout: 5_000,
  });
}

async function deleteByTitle(page: Page, title: string) {
  await gotoPortfolioAdmin(page);
  const row = page
    .locator('div:has(button[aria-label="Удалить"])')
    .filter({ hasText: title })
    .first();
  if ((await row.count()) === 0) return;
  await row.scrollIntoViewIfNeeded();
  await row
    .locator('button[aria-label="Удалить"]')
    .first()
    .click({ force: true });
  // Подтверждение в ConfirmDialog: ищем кнопку "Удалить" в открытом модальном.
  const confirmBtn = page.getByRole("button", { name: /удалить/i }).last();
  await confirmBtn.click({ force: true });
  await expect(
    page.locator('[data-sonner-toast]:has-text("Работа удалена")'),
  ).toBeVisible({ timeout: 8_000 });
}

test.describe("Admin: Portfolio category dropdown (regression)", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(240_000);

  test("category select persists across save/reload roundtrips", async ({
    page,
  }) => {
    await login(page);

    // Setup.
    await gotoPortfolioAdmin(page);
    await fillCreateForm(page);

    try {
      // Шаг 1: после create — категория «Полиграфия» persisted.
      await page.reload({ waitUntil: "networkidle" });
      await openEditByTitle(page, TEST_TITLE);
      const afterCreate = await readCategoryFromOpenDialog(page);
      console.log("[1] категория после create:", afterCreate || "(пусто)");
      expect(afterCreate).toBe("Полиграфия");

      // Шаг 2: меняем → «Наружная реклама».
      await changeCategoryAndSave(page, "Наружная реклама");
      await page.reload({ waitUntil: "networkidle" });
      await openEditByTitle(page, TEST_TITLE);
      const afterUpdate = await readCategoryFromOpenDialog(page);
      console.log("[2] категория после update:", afterUpdate);
      expect(afterUpdate).toBe("Наружная реклама");

      // Шаг 3: меняем → «Фасады».
      await changeCategoryAndSave(page, "Фасады");
      await page.reload({ waitUntil: "networkidle" });
      await openEditByTitle(page, TEST_TITLE);
      const afterSecondUpdate = await readCategoryFromOpenDialog(page);
      console.log("[3] категория после второго update:", afterSecondUpdate);
      expect(afterSecondUpdate).toBe("Фасады");

      await page.locator('button[aria-label="Закрыть"]').first().click();
      await expect(page.locator("text=Редактировать работу")).toBeHidden({
        timeout: 5_000,
      });
    } finally {
      await deleteByTitle(page, TEST_TITLE);
    }
  });
});
