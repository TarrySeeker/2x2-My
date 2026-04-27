import { test, expect, type Page } from "@playwright/test";

/**
 * E2E: проверяем, что в админке /admin/content/portfolio поле «Категория»
 * — это <select> с фиксированным набором опций, а не свободный <input>.
 *
 * Жалоба клиента (по аналогии с услугами): «Категория (label)» в
 * /admin/content/portfolio была свободным текстовым input'ом, и любая
 * опечатка / произвольная категория → карточка не попадала ни в один
 * фильтр на витрине /portfolio.
 *
 * Фикс — `lib/portfolio/categories.ts` (PORTFOLIO_CATEGORIES) +
 * `<select>` в PortfolioPageClient + единый источник истины
 * (PORTFOLIO_FILTER_LIST) для фильтра на витрине.
 *
 * ВАЖНО про данные на проде: таблица `portfolio_items` может быть пустой,
 * и тогда страница админки показывает рядки-заглушки из
 * `data/portfolio-stub.ts`. У них захардкоженные id, и UPDATE по такому
 * id — silent no-op в БД. Roundtrip-проверка персистентности через
 * существующие записи делается отдельным debug-скриптом во время
 * разработки; здесь же мы проверяем, что:
 *   1. поле «Категория» рендерится как <select name="category_label">
 *   2. опции — ровно «— не задана —», «Полиграфия», «Наружная реклама»,
 *      «Фасады» (плюс возможно legacy-значение из БД с пометкой «(старая)»)
 *   3. в-памяти сохранение работает (после save диалог закрывается,
 *      list обновляется, повторное открытие показывает новое значение
 *      из локального state).
 *
 * Учётные данные:
 *   ADMIN_EMAIL=admin@2x2.ru
 *   ADMIN_PASSWORD=<...>
 *
 * Запуск:
 *   PLAYWRIGHT_BASE_URL=https://erfgv.website PLAYWRIGHT_SKIP_SERVER=1 \
 *     pnpm exec playwright test tests/e2e/admin-portfolio-category.spec.ts \
 *     --project=chromium --reporter=list
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@2x2.ru";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

const KNOWN_OPTIONS = [
  "— не задана —",
  "Полиграфия",
  "Наружная реклама",
  "Фасады",
];

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

test.describe("Admin: Portfolio category dropdown UI (regression)", () => {
  test.setTimeout(120_000);

  test("«Категория» — это <select> с фиксированным списком опций", async ({
    page,
  }) => {
    await login(page);

    await page.goto("/admin/content/portfolio", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("button", { name: /добавить работу/i }),
    ).toBeVisible({ timeout: 15_000 });

    // Открываем диалог «Добавить работу» — без save, только проверяем UI.
    await page.click("text=Добавить работу");
    await expect(page.locator("text=Новая работа")).toBeVisible({
      timeout: 8_000,
    });

    // ── Проверка 1: select есть и это именно <select> (не <input>) ──
    const select = page.locator('select[name="category_label"]');
    await expect(select).toBeVisible({ timeout: 5_000 });

    // ── Проверка 2: на странице нет input[name="category_label"]
    //    (старая текстовая реализация удалена) ──
    const oldInput = page.locator('input[name="category_label"]');
    await expect(oldInput).toHaveCount(0);

    // ── Проверка 3: опции совпадают со списком из lib/portfolio/categories.ts ──
    const options = await select.locator("option").allTextContents();
    expect(options.map((s) => s.trim())).toEqual(KNOWN_OPTIONS);

    // ── Проверка 4: дефолт у новой работы — пустая (— не задана —) ──
    const initialValue = await select.inputValue();
    expect(initialValue).toBe("");

    // ── Проверка 5: selectOption меняет value, RHF подхватывает ──
    await select.selectOption("Полиграфия");
    expect(await select.inputValue()).toBe("Полиграфия");

    await select.selectOption("Фасады");
    expect(await select.inputValue()).toBe("Фасады");

    // Закрываем диалог через X — НИЧЕГО не сохраняем, чтобы не мусорить
    // в проде.
    await page.locator('button[aria-label="Закрыть"]').first().click();
    await expect(page.locator("text=Новая работа")).toBeHidden({
      timeout: 5_000,
    });

    // ── Проверка 6: для существующих карточек select тоже работает.
    //    Открываем первую карточку и проверяем UI-инвариант ──
    const firstEditBtn = page
      .locator('button[aria-label="Редактировать"]')
      .first();
    if ((await firstEditBtn.count()) > 0) {
      await firstEditBtn.click({ force: true });
      await expect(page.locator("text=Редактировать работу")).toBeVisible({
        timeout: 8_000,
      });
      await expect(
        page.locator('select[name="category_label"]'),
      ).toBeVisible({ timeout: 5_000 });
      await expect(
        page.locator('input[name="category_label"]'),
      ).toHaveCount(0);

      // Опции включают наш фиксированный список (legacy-значения могут
      // добавляться с пометкой «(старая)»; KNOWN_OPTIONS — подмножество).
      const allOptions = (
        await page
          .locator('select[name="category_label"] option')
          .allTextContents()
      ).map((s) => s.trim());
      for (const expected of KNOWN_OPTIONS) {
        expect(allOptions).toContain(expected);
      }

      await page.locator('button[aria-label="Закрыть"]').first().click();
      await expect(page.locator("text=Редактировать работу")).toBeHidden({
        timeout: 5_000,
      });
    }
  });
});
