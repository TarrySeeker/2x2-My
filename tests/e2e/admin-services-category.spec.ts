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

// Тест-стратегия: на проде есть несколько услуг и состояние БД может
// меняться. Берём ВИДИМУЮ услугу с заданным title, читаем её текущую
// категорию из select'а, затем меняем на ОТЛИЧНУЮ временную категорию,
// проверяем отражение на /services и ОТКАТЫВАЕМ к исходной.
// Это безопаснее, чем хардкодить ожидаемое значение.
const TARGET_TITLE = "Полиграфия";
// Кандидаты для временной смены — выбираем первый, отличный от исходного.
const TEMP_CATEGORY_CANDIDATES: Array<{ value: string; label: string }> = [
  { value: "installation", label: "Монтаж" },
  { value: "design", label: "Дизайн" },
  { value: "facade", label: "Фасады и оформление" },
  { value: "outdoor", label: "Наружная реклама" },
  { value: "polygraphy", label: "Полиграфия" },
];

async function login(page: Page) {
  if (!ADMIN_PASSWORD) {
    test.skip(true, "ADMIN_PASSWORD env not set");
  }
  // networkidle — чтобы дать React гидратировать форму (иначе click до
  // hydration отправляет дефолтный browser-submit GET-запрос с email/password
  // в query string, что точно не то, чего мы хотим).
  await page.goto("/admin/login", { waitUntil: "networkidle" });
  // Подождать, пока кнопка станет интерактивной (RHF + zod resolver
  // подключатся).
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

async function openServiceEditDialog(page: Page, title: string) {
  await page.goto("/admin/content/services", { waitUntil: "networkidle" });

  // На проде список рендерится в таблице/li через DnD-сортируемые ряды.
  // Ждём появления хотя бы одной кнопки «Редактировать» (она есть в каждой
  // строке, независимо от того, табличная вёрстка или li).
  await page.waitForSelector('button[aria-label="Редактировать"]', {
    timeout: 15_000,
    state: "visible",
  });

  // Берём ПЕРВУЮ ВИДИМУЮ строку с нужным title, ИСКЛЮЧАЯ скрытые
  // (бейдж «Скрыто» рядом с названием). Поднимаемся от title-ячейки
  // к ближайшему row-контейнеру, у которого есть кнопка «Редактировать».
  const row = page
    .locator(':scope >> :is(li, tr, div)')
    .filter({ has: page.locator('button[aria-label="Редактировать"]') })
    .filter({ hasText: title })
    .filter({ hasNot: page.locator("text=Скрыто") })
    .filter({ hasNot: page.locator("text=скрыто") })
    .first();

  await expect(row).toBeVisible({ timeout: 10_000 });
  await row.scrollIntoViewIfNeeded();

  // Клик по карандашу. force:true — потому что sticky header может
  // перекрывать кнопку при scroll.
  const editBtn = row.locator('button[aria-label="Редактировать"]').first();
  await editBtn.scrollIntoViewIfNeeded();
  await editBtn.click({ force: true });

  // Ждём диалог с form.
  await expect(page.locator("text=Редактировать услугу")).toBeVisible({
    timeout: 8_000,
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
  test.describe.configure({ mode: "serial" });
  test.setTimeout(120_000);

  test("category change from admin reflects on /services and roundtrips back", async ({
    page,
  }) => {
    await login(page);

    // ---------- Шаг 1: открываем услугу и читаем её исходную категорию ----------
    await openServiceEditDialog(page, TARGET_TITLE);
    const originalCategory = await page
      .locator('select[name="category"]')
      .inputValue();
    console.log("[1] исходная category из админки:", originalCategory);
    expect(originalCategory).toBeTruthy();

    // Закрываем диалог через X-кнопку (ESC у этого modal не подвешен).
    await page.locator('button[aria-label="Закрыть"]').first().click();
    await expect(page.locator("text=Редактировать услугу")).toBeHidden({
      timeout: 5_000,
    });

    // Запоминаем исходную группу на витрине — должна совпадать с
    // лейблом исходной категории.
    const groupBefore = await readCategoryFromServicesPage(page, TARGET_TITLE);
    console.log("[2] группа на /services до изменения:", groupBefore);
    expect(groupBefore).toBeTruthy();

    // ---------- Шаг 2: выбираем заведомо ОТЛИЧНУЮ временную категорию ----------
    const tempCategory = TEMP_CATEGORY_CANDIDATES.find(
      (c) => c.value !== originalCategory,
    )!;
    console.log("[3] временная категория для теста:", tempCategory.value);

    await openServiceEditDialog(page, TARGET_TITLE);
    // Доказательство, что select корректно показывает текущую категорию
    // (initial value формы из БД подтянулся правильно).
    const selectedBefore = await page
      .locator('select[name="category"]')
      .inputValue();
    expect(selectedBefore).toBe(originalCategory);

    await setCategoryAndSave(page, tempCategory.value);

    // ---------- Шаг 3: проверяем, что на /services услуга переехала ----------
    const groupAfter = await readCategoryFromServicesPage(page, TARGET_TITLE);
    console.log("[4] группа на /services после изменения:", groupAfter);
    expect(groupAfter).toBe(tempCategory.label);

    // ---------- Шаг 4: ОТКАТ ----------
    await openServiceEditDialog(page, TARGET_TITLE);
    const selectedAfter = await page
      .locator('select[name="category"]')
      .inputValue();
    expect(selectedAfter).toBe(tempCategory.value);
    await setCategoryAndSave(page, originalCategory);

    // Финальная проверка — состояние БД восстановлено.
    const groupFinal = await readCategoryFromServicesPage(page, TARGET_TITLE);
    console.log("[5] группа на /services после отката:", groupFinal);
    expect(groupFinal).toBe(groupBefore);
  });
});
