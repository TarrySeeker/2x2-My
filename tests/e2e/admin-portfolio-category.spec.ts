import { test, expect, type Page } from "@playwright/test";

/**
 * E2E: проверяем редактирование категории работы портфолио в админке.
 *
 * Жалоба клиента (по аналогии с услугами): «Категория (label)» в
 * /admin/content/portfolio была свободным текстовым input'ом, и любая
 * опечатка / произвольная категория → карточка не попадает ни в один
 * фильтр на витрине /portfolio.
 *
 * Тест полностью автономный (НЕ трогает БД напрямую):
 *   1. Логинится как admin@2x2.ru
 *   2. Идёт на /admin/content/portfolio
 *   3. Открывает первую опубликованную работу (по кнопке «Редактировать»)
 *   4. Запоминает текущее значение select.category_label
 *   5. Меняет на ОТЛИЧНУЮ категорию из PORTFOLIO_CATEGORIES
 *   6. Нажимает Сохранить, ждёт toast «Работа обновлена»
 *   7. Идёт на /portfolio, кликает фильтр-кнопку с новой категорией —
 *      карточка должна быть в выдаче
 *   8. ОТКАТЫВАЕТ обратно в исходное состояние тем же UI
 *
 * Должен запускаться против прода с PLAYWRIGHT_BASE_URL=https://erfgv.website
 * и PLAYWRIGHT_SKIP_SERVER=1.
 *
 * Учётные данные:
 *   ADMIN_EMAIL=admin@2x2.ru
 *   ADMIN_PASSWORD=<...>
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@2x2.ru";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

// Должны совпадать с lib/portfolio/categories.ts.
// value === label (русские строки), это сознательное отличие от services.
const PORTFOLIO_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "Полиграфия", label: "Полиграфия" },
  { value: "Наружная реклама", label: "Наружная реклама" },
  { value: "Фасады", label: "Фасады" },
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

async function openFirstPortfolioEditDialog(page: Page): Promise<string> {
  await page.goto("/admin/content/portfolio", { waitUntil: "networkidle" });

  // На вкладке «Все работы» рендерятся sortable-rows с кнопкой
  // «Редактировать» (aria-label="Редактировать") в каждой строке.
  await page.waitForSelector('button[aria-label="Редактировать"]', {
    timeout: 15_000,
    state: "visible",
  });

  // Берём первую видимую кнопку «Редактировать» и поднимаемся к
  // ближайшему контейнеру строки, чтобы извлечь title для возможного
  // последующего поиска работы на /portfolio (по h3).
  const editBtn = page
    .locator('button[aria-label="Редактировать"]')
    .first();
  await editBtn.scrollIntoViewIfNeeded();

  // Достаём title из строки до клика, чтобы знать, что искать на витрине.
  const title = await editBtn.evaluate((btn) => {
    let cur: Element | null = btn;
    // Поднимаемся вверх, пока не найдём элемент с .truncate.font-medium
    // (см. SortableRow в PortfolioPageClient — это .truncate.font-medium).
    while (cur && cur !== document.body) {
      const titleEl = cur.querySelector?.(
        "p.truncate.font-medium",
      ) as HTMLElement | null;
      if (titleEl?.textContent) return titleEl.textContent.trim();
      cur = cur.parentElement;
    }
    return "";
  });
  expect(title.length).toBeGreaterThan(0);

  await editBtn.click({ force: true });

  // Ждём диалог.
  await expect(page.locator("text=Редактировать работу")).toBeVisible({
    timeout: 8_000,
  });

  return title;
}

async function setCategoryAndSave(page: Page, value: string) {
  await page
    .locator('select[name="category_label"]')
    .selectOption(value);
  await page.click('button[type="submit"]:has-text("Сохранить")');
  await expect(
    page.locator('[data-sonner-toast]:has-text("Работа обновлена")'),
  ).toBeVisible({ timeout: 8_000 });
  await expect(page.locator("text=Редактировать работу")).toBeHidden({
    timeout: 5_000,
  });
}

async function isWorkVisibleUnderFilter(
  page: Page,
  workTitle: string,
  filterLabel: string,
): Promise<boolean> {
  await page.goto("/portfolio?nocache=" + Date.now(), {
    waitUntil: "domcontentloaded",
  });

  // Кликаем фильтр-кнопку.
  const filterBtn = page
    .locator('button[aria-label]')
    .filter({ hasText: new RegExp(`^${escapeRegExp(filterLabel)}$`) })
    .first();
  // Иногда aria-label у кнопок отсутствует — fallback на текст.
  const realFilter = (await filterBtn.count())
    ? filterBtn
    : page
        .locator("button")
        .filter({ hasText: new RegExp(`^${escapeRegExp(filterLabel)}$`) })
        .first();

  await realFilter.scrollIntoViewIfNeeded();
  await realFilter.click({ force: true });

  // Даём React/анимациям время отфильтровать.
  await page.waitForTimeout(400);

  // Проверяем, есть ли карточка с h3, текст которого содержит workTitle.
  const card = page.locator(`h3:has-text(${JSON.stringify(workTitle)})`);
  const count = await card.count();
  return count > 0;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test.describe("Admin: Portfolio category dropdown (regression)", () => {
  test.describe.configure({ mode: "serial" });
  test.setTimeout(150_000);

  test("category change from admin reflects on /portfolio filter and roundtrips back", async ({
    page,
  }) => {
    await login(page);

    // ---------- Шаг 1: открываем первую работу и читаем её состояние ----------
    const workTitle = await openFirstPortfolioEditDialog(page);
    console.log("[1] выбранная работа:", workTitle);

    const originalCategory = await page
      .locator('select[name="category_label"]')
      .inputValue();
    console.log("[2] исходная category_label:", originalCategory || "(пусто)");

    // Закрываем диалог через крестик.
    await page.locator('button[aria-label="Закрыть"]').first().click();
    await expect(page.locator("text=Редактировать работу")).toBeHidden({
      timeout: 5_000,
    });

    // ---------- Шаг 2: выбираем заведомо ОТЛИЧНУЮ категорию ----------
    const tempCategory = PORTFOLIO_CATEGORIES.find(
      (c) => c.value !== originalCategory,
    );
    expect(tempCategory).toBeTruthy();
    if (!tempCategory) return;
    console.log("[3] временная категория:", tempCategory.value);

    await openFirstPortfolioEditDialog(page);
    // Ждём, пока RHF проинициализирует select.
    await page.waitForFunction(
      (expected: string) => {
        const sel = document.querySelector(
          'select[name="category_label"]',
        ) as HTMLSelectElement | null;
        return !!sel && sel.value === expected;
      },
      originalCategory,
      { timeout: 5_000 },
    );
    const selectedBefore = await page
      .locator('select[name="category_label"]')
      .inputValue();
    expect(selectedBefore).toBe(originalCategory);

    await setCategoryAndSave(page, tempCategory.value);

    // ---------- Шаг 3: на /portfolio фильтр по новой категории показывает работу ----------
    const visibleUnderTemp = await isWorkVisibleUnderFilter(
      page,
      workTitle,
      tempCategory.label,
    );
    console.log(
      "[4] карточка видна под фильтром «" +
        tempCategory.label +
        "»: " +
        visibleUnderTemp,
    );
    expect(visibleUnderTemp).toBe(true);

    // ---------- Шаг 4: ОТКАТ ----------
    await openFirstPortfolioEditDialog(page);
    // Ждём, пока RHF проинициализирует select из defaultValues
    // (`useForm({ values })` синхронизируется не на первый кадр).
    await page.waitForFunction(
      (expected: string) => {
        const sel = document.querySelector(
          'select[name="category_label"]',
        ) as HTMLSelectElement | null;
        return !!sel && sel.value === expected;
      },
      tempCategory.value,
      { timeout: 5_000 },
    );
    const selectedAfter = await page
      .locator('select[name="category_label"]')
      .inputValue();
    expect(selectedAfter).toBe(tempCategory.value);

    // Если исходная категория была пустой — выбираем «— не задана —» (value=""),
    // иначе восстанавливаем исходное значение.
    await setCategoryAndSave(page, originalCategory);

    // Финальная проверка: если исходная категория была одной из known,
    // карточка должна снова попадать под её фильтр на витрине.
    if (originalCategory && originalCategory !== tempCategory.value) {
      const visibleUnderOriginal = await isWorkVisibleUnderFilter(
        page,
        workTitle,
        originalCategory,
      );
      console.log(
        "[5] откат — карточка под фильтром «" +
          originalCategory +
          "»: " +
          visibleUnderOriginal,
      );
      // Если оригинальная категория не входит в PORTFOLIO_CATEGORIES
      // (legacy-значение), фильтр-кнопки на витрине для неё не будет,
      // поэтому проверяем только когда категория из known-набора.
      const known = PORTFOLIO_CATEGORIES.some(
        (c) => c.value === originalCategory,
      );
      if (known) {
        expect(visibleUnderOriginal).toBe(true);
      }
    }
  });
});
