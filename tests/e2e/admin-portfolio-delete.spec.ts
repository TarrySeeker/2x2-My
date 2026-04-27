import { test, expect, type Page } from "@playwright/test";

/**
 * E2E: проверяем, что в админке /admin/content/portfolio
 *  - можно создать новую работу через UI;
 *  - её сразу видно в списке;
 *  - удаление через кнопку «Корзина» + ConfirmDialog действительно
 *    убирает запись (toast «Работа удалена», карточка исчезла).
 *
 * Regression на bug Wave 1 (2026-04-27): удаление падало с
 * «Некорректный id», потому что BIGSERIAL `id` приходит из RSC payload
 * как строка, а Zod-схема `z.number().int().positive()` строку не
 * принимала. Фикс — `z.coerce.number().int().positive()` во всех
 * server actions портфолио.
 *
 * Учётные данные:
 *   ADMIN_EMAIL=admin@2x2.ru
 *   ADMIN_PASSWORD=<…>
 *
 * Запуск:
 *   PLAYWRIGHT_BASE_URL=https://erfgv.website PLAYWRIGHT_SKIP_SERVER=1 \
 *     pnpm exec playwright test tests/e2e/admin-portfolio-delete.spec.ts \
 *     --project=chromium --reporter=list
 *
 * NB: тест ходит в реальную БД и создаёт строку с slug-ом
 * `__qa-delete-<timestamp>`. Если по какой-то причине удаление
 * провалится, запись останется в `portfolio_items` и попадёт в
 * orphan-список — это покрывается отдельной WAVE 1 проверкой.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@2x2.ru";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

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

test.describe("Admin: Portfolio create + delete via UI (Wave 1 regression)", () => {
  test.setTimeout(180_000);

  test("создаёт работу, проверяет в списке, удаляет, проверяет что исчезла", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/admin/content/portfolio", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("button", { name: /добавить работу/i }),
    ).toBeVisible({ timeout: 15_000 });

    // Уникальный slug, чтобы НЕ конфликтовать с реальными работами и
    // другими прогонами (orphan-cleaner ищет именно `__qa-`).
    const ts = Date.now();
    const slug = `__qa-delete-${ts}`;
    const title = `__qa Удаление ${ts}`;

    // ── 1. Открываем диалог «Добавить работу» ──
    await page.click("text=Добавить работу");
    await expect(page.locator("text=Новая работа")).toBeVisible({
      timeout: 8_000,
    });

    // ── 2. Заполняем минимально валидную форму ──
    await page.fill('input[name="title"]', title);
    await page.fill('input[name="slug"]', slug);
    // cover_url требуется (zod rule). Подставляем 1×1 png-data-url
    // через прямую запись в state RHF — но так нельзя без сложных
    // обходов. Делаем проще: используем абсолютный URL картинки уже
    // существующей в whitelist (unsplash). ImageUploadField принимает
    // и URL, и upload — у нас выберем «вставить URL» через сам инпут,
    // если он есть. Резерв — fallback на uploaded asset вручную.
    // Поскольку ImageUploadField может не давать прямого text-input,
    // запишем cover_url напрямую через JS (RHF setValue не достанем —
    // используем простой DOM dispatch на скрытом input, иначе пробуем
    // через UI кнопку «Использовать URL»).
    const fallbackCover =
      "https://images.unsplash.com/photo-1521337581100-8ca9a73a5f79?w=400";
    // Попробуем найти видимый url-input у обложки.
    const urlInput = page.locator('input[placeholder*="https://"]').first();
    if ((await urlInput.count()) > 0) {
      await urlInput.fill(fallbackCover);
      // Иногда нужно нажать «Применить» / blur.
      await urlInput.blur();
    } else {
      // Last-resort: установим cover_url напрямую через RHF event.
      await page.evaluate((url) => {
        const ev = new CustomEvent("__qa-set-cover", {
          detail: { url },
        });
        window.dispatchEvent(ev);
      }, fallbackCover);
    }

    // Year по умолчанию = текущий, но всё равно перепишем.
    const yearInput = page.locator('input[name="year"]');
    if ((await yearInput.count()) > 0) {
      await yearInput.fill(String(new Date().getFullYear()));
    }

    // is_published: чекбокс по умолчанию включён в форме («true» в
    // defaultValues). Не трогаем.

    // ── 3. Сабмит ──
    await page.locator('button[type="submit"]:has-text("Создать")').click();

    // Toast «Работа создана».
    await expect(page.locator('text=Работа создана')).toBeVisible({
      timeout: 10_000,
    });

    // Диалог закрылся.
    await expect(page.locator("text=Новая работа")).toBeHidden({
      timeout: 5_000,
    });

    // ── 4. Проверяем, что строчка появилась в списке ──
    await expect(page.locator(`text=${title}`)).toBeVisible({
      timeout: 10_000,
    });

    // ── 5. Удаляем через кнопку «Корзина» рядом с этой строкой ──
    // Найдём конкретную карточку по slug-фрагменту /__qa-delete-<ts>
    const row = page.locator(`text=/${slug}`).first();
    await expect(row).toBeVisible({ timeout: 5_000 });

    // Поднимаемся до общего родителя строки, и в нём ищем кнопку
    // [aria-label="Удалить"]. Карточка имеет flex-структуру,
    // ближайший контейнер — `.flex.items-center.gap-3.rounded-xl`.
    const card = row.locator(
      'xpath=ancestor::*[contains(@class,"rounded-xl") and contains(@class,"items-center")][1]',
    );
    await card.locator('button[aria-label="Удалить"]').click();

    // ConfirmDialog открылся.
    await expect(page.locator("text=Удалить работу из портфолио?")).toBeVisible(
      { timeout: 5_000 },
    );

    // Подтверждаем.
    await page.locator('button:has-text("Удалить")').last().click();

    // ── 6. Toast «Работа удалена» и строка исчезла. ──
    await expect(page.locator('text=Работа удалена')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.locator(`text=${title}`)).toHaveCount(0, {
      timeout: 5_000,
    });

    // ── 7. Lifeline-проверка: refresh страницы, и снова не видно. ──
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(`text=${title}`)).toHaveCount(0, {
      timeout: 5_000,
    });
  });
});
