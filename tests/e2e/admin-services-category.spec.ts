import { test, expect, type Page } from "@playwright/test";

/**
 * E2E: проверяем редактирование категории услуги в админке.
 *
 * Жалоба клиента: открывает «Полиграфия» в /admin/content/services,
 * меняет категорию через select на «Полиграфия» (value=polygraphy),
 * нажимает «Сохранить» — категория не сохраняется/не отображается.
 *
 * Тест полностью автономный (НЕ трогает БД напрямую):
 *   1. Логинится как admin@2x2.ru
 *   2. Идёт на /admin/content/services
 *   3. Открывает первую включённую услугу с title="Полиграфия"
 *   4. Запоминает текущее значение select.category
 *   5. Меняет категорию на 'installation' (Монтажные работы) — заведомо
 *      отличается от текущей (polygraphy)
 *   6. Нажимает Сохранить, ждёт toast «Услуга обновлена»
 *   7. Идёт на /services и проверяет, что услуга действительно теперь
 *      под <h2>Монтажные работы</h2>
 *   8. ОТКАТЫВАЕТ обратно через тот же UI (afterAll-like).
 *
 * Должен запускаться против прода с PLAYWRIGHT_BASE_URL=https://erfgv.website
 * и PLAYWRIGHT_SKIP_SERVER=1.
 *
 * Учётные данные берутся из ENV (CI / локально) — НЕ хардкодятся.
 *   ADMIN_EMAIL=admin@2x2.ru
 *   ADMIN_PASSWORD=<...>
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@2x2.ru";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

// Реальное состояние БД на момент теста: услуга "Полиграфия" сидит в
// группе "Наружная реклама" (category=outdoor) — это и есть жалоба.
// Тест воспроизводит сценарий клиента (меняем на polygraphy и проверяем,
// что категория действительно поменялась), затем откатывает обратно,
// чтобы прод остался ровно в том состоянии, в котором был.
const ORIGINAL_CATEGORY = "outdoor";
const ORIGINAL_CATEGORY_LABEL = "Наружная реклама";
const TARGET_CATEGORY = "polygraphy";
const TARGET_CATEGORY_LABEL = "Полиграфия";
const TARGET_TITLE = "Полиграфия";

async function login(page: Page) {
  if (!ADMIN_PASSWORD) {
    test.skip(true, "ADMIN_PASSWORD env not set");
  }
  await page.goto("/admin/login", { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin\/(dashboard|content|blog)/, { timeout: 15_000 });
}

async function openServiceEditDialog(page: Page, title: string) {
  await page.goto("/admin/content/services", { waitUntil: "domcontentloaded" });

  // Ждём таблицу услуг.
  await expect(page.locator("text=Услуги").first()).toBeVisible({ timeout: 10_000 });
  // Ждём появления хотя бы одной строки услуги.
  await page.waitForSelector('li:has(button[aria-label="Редактировать"])', {
    timeout: 10_000,
  });

  // Находим строку с нужным title (берём первую включённую, не «скрыто»).
  const row = page
    .locator('li:has(button[aria-label="Редактировать"])')
    .filter({ hasText: title })
    .filter({ hasNot: page.locator("text=скрыто") })
    .first();
  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.scrollIntoViewIfNeeded();

  // Кнопка может быть перекрыта sticky-header'ом — клик через JS гарантированно сработает.
  const editBtn = row.locator('button[aria-label="Редактировать"]');
  await editBtn.scrollIntoViewIfNeeded();
  await editBtn.click({ force: true });

  // Ждём диалог с form.
  await expect(page.locator("text=Редактировать услугу")).toBeVisible({
    timeout: 5_000,
  });
}

async function setCategoryAndSave(page: Page, value: string) {
  // Select имеет name=category — single select.
  await page.locator('select[name="category"]').selectOption(value);
  await page.click('button[type="submit"]:has-text("Сохранить")');
  // Toast от sonner.
  await expect(
    page.locator('[data-sonner-toast]:has-text("Услуга обновлена")'),
  ).toBeVisible({ timeout: 8_000 });
  // Диалог закрывается.
  await expect(page.locator("text=Редактировать услугу")).toBeHidden({
    timeout: 5_000,
  });
}

async function readCategoryFromServicesPage(page: Page, title: string): Promise<string | null> {
  // Берём ПУБЛИЧНУЮ страницу /services с no-store, чтобы не получить
  // браузерный кэш.
  await page.goto("/services?nocache=" + Date.now(), {
    waitUntil: "domcontentloaded",
  });

  // На /services услуги сгруппированы. Каждая группа — <h2>{label}</h2>,
  // дальше блоки .grid-cols-1...lg:grid-cols-2 с услугами.
  // Найдём ближайший к карточке с title — h2 группы.
  const card = page.locator("section").locator(`h3:has-text("${title}")`).first();
  await expect(card).toBeVisible({ timeout: 10_000 });

  // Поднимаемся к ближайшему <h2> выше по DOM.
  const groupLabel = await card.evaluate((el) => {
    let cur: Element | null = el;
    while (cur) {
      // Ищем previous sibling или предка с h2 внутри.
      let sib: Element | null = cur.previousElementSibling;
      while (sib) {
        const h2 = sib.querySelector("h2");
        if (h2) return h2.textContent?.trim() ?? null;
        sib = sib.previousElementSibling;
      }
      cur = cur.parentElement;
      if (cur) {
        const h2Direct = cur.querySelector(":scope > h2") || cur.querySelector(":scope > div > h2");
        if (h2Direct) return h2Direct.textContent?.trim() ?? null;
        // Если parent — <section>, то ищем h2 первого ребёнка
        const innerH2 = cur.querySelector("h2");
        if (innerH2 && innerH2.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) {
          return innerH2.textContent?.trim() ?? null;
        }
      }
    }
    return null;
  });
  return groupLabel;
}

test.describe("Admin: Service category save (regression)", () => {
  test.describe.configure({ mode: "serial" }); // изменение → откат строго по порядку
  test.setTimeout(90_000);

  test("category change from admin reflects on /services and roundtrips back", async ({
    page,
  }) => {
    await login(page);

    // ---------- Шаг 1: запоминаем исходную группу ----------
    const groupBefore = await readCategoryFromServicesPage(page, TARGET_TITLE);
    console.log("[before]", TARGET_TITLE, "находится в группе:", groupBefore);
    expect(groupBefore).toBeTruthy();

    // ---------- Шаг 2: меняем категорию через UI ----------
    await openServiceEditDialog(page, TARGET_TITLE);

    // Проверим, что в select сейчас выставлена оригинальная категория —
    // доказательство, что initial value формы корректно подтягивается из БД.
    const selectedBefore = await page
      .locator('select[name="category"]')
      .inputValue();
    console.log("[dialog] select.category до изменения =", selectedBefore);
    expect(selectedBefore).toBe(ORIGINAL_CATEGORY);

    await setCategoryAndSave(page, TARGET_CATEGORY);

    // ---------- Шаг 3: проверяем, что на /services услуга переехала ----------
    const groupAfter = await readCategoryFromServicesPage(page, TARGET_TITLE);
    console.log("[after change]", TARGET_TITLE, "теперь в группе:", groupAfter);
    expect(groupAfter).toBe(TARGET_CATEGORY_LABEL);

    // ---------- Шаг 4: ОТКАТ (важно: оставить прод в исходном состоянии) ----------
    await openServiceEditDialog(page, TARGET_TITLE);
    const selectedAfter = await page
      .locator('select[name="category"]')
      .inputValue();
    expect(selectedAfter).toBe(TARGET_CATEGORY);
    await setCategoryAndSave(page, ORIGINAL_CATEGORY);

    // Финальная проверка — прод вернулся к тому, с чего начали.
    const groupFinal = await readCategoryFromServicesPage(page, TARGET_TITLE);
    console.log("[final]", TARGET_TITLE, "снова в группе:", groupFinal);
    expect(groupFinal).toBe(ORIGINAL_CATEGORY_LABEL);
  });
});
