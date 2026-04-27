import { test, expect, type Page } from "@playwright/test";

/**
 * E2E: проверяем, что в админке /admin/content/portfolio
 *  - можно создать новую работу через UI (с реальной загрузкой обложки в MinIO);
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
 * NB: тест ходит в реальную БД и создаёт строку с slug
 * `__qa-delete-<timestamp>`. Если по какой-то причине удаление
 * провалится, запись останется в `portfolio_items` и попадёт в
 * orphan-список — это покрывается отдельной WAVE 1 проверкой.
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@2x2.ru";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

// Минимальный PNG 1×1 (8 байт magic + IHDR + IDAT + IEND), валидный для image/png.
// Берём предварительно подготовленный base64.
const ONE_PX_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgAAIAAAUAAen63NgAAAAASUVORK5CYII=";

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

    // Уникальный slug. Schema запрещает `_` в slug, поэтому используем
    // `qa-delete-…`. Title всё равно начинается с `__qa` для удобства
    // ручного поиска и работы с orphan-checker'ом.
    const ts = Date.now();
    const slug = `qa-delete-${ts}`;
    const title = `__qa Удаление ${ts}`;

    // ── 1. Открываем диалог «Добавить работу» ──
    await page.click("text=Добавить работу");
    await expect(page.locator("text=Новая работа")).toBeVisible({
      timeout: 8_000,
    });

    // ── 2. Заполняем title + slug ──
    await page.fill('input[name="title"]', title);
    await page.fill('input[name="slug"]', slug);

    // ── 3. Загружаем обложку (1×1 PNG через скрытый file-input в dropzone). ──
    // ImageUploadField на основе react-dropzone имеет hidden <input type="file">.
    // setInputFiles работает с тем, что matched первым.
    const buf = Buffer.from(ONE_PX_PNG_BASE64, "base64");
    const fileInputs = page.locator('input[type="file"]');
    // Берём именно первый — это поле «Обложка». Второй может быть для галереи.
    await fileInputs.first().setInputFiles({
      name: "qa-cover.png",
      mimeType: "image/png",
      buffer: buf,
    });

    // Ждём, пока URL обложки появится (компонент покажет превью).
    // Самый надёжный маркер — что value cover_url в DOM непустой.
    // ImageUploadField рендерит предупреждение «внешний URL» / preview;
    // удобнее ждать, пока кнопка «Создать» снова доступна (форма не во
    // время загрузки + cover валиден). Но проще — фиксированный wait
    // плюс toast «Загружено».
    await expect(page.locator('text=/Загруж/').first()).toBeVisible({
      timeout: 20_000,
    });

    // ── 4. Сабмит ──
    // Сразу до клика подписываемся на оба исхода: успех (диалог закрылся
    // или появился toast «Работа создана») / ошибка (toast «Ошибка…»).
    // Если успех — значит созданная работа доехала до сервера и обратно.
    const successToast = page.locator('text=Работа создана');
    const dialogClosed = page.locator("text=Новая работа");
    const errorToast = page
      .locator('[data-sonner-toast]:has-text("Ошибка"), [data-sonner-toast]:has-text("Не удалось"), [data-sonner-toast][data-type="error"]')
      .first();

    await page.locator('button[type="submit"]:has-text("Создать")').click();

    // Sonner-тост может исчезнуть за ~4-5 сек, поэтому полагаемся в
    // первую очередь на закрытие диалога (это случается при ok=true).
    // Если диалог не закрылся — значит сервер ответил ошибкой и tост
    // показывается на форме.
    const winnerIdx = await Promise.race([
      successToast
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => 0),
      dialogClosed
        .waitFor({ state: "hidden", timeout: 15_000 })
        .then(() => 1),
      errorToast
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => 2),
    ]).catch(() => -1);

    if (winnerIdx === 2 || (await errorToast.isVisible().catch(() => false))) {
      const errText = await errorToast.textContent();
      throw new Error(`Создание упало с ошибкой: ${errText}`);
    }

    // Финальная гарантия — диалог не виден.
    await expect(dialogClosed).toBeHidden({ timeout: 5_000 });

    // ── 5. Проверяем, что строчка появилась в списке ──
    const titleLocator = page.locator(`text=${title}`).first();
    await expect(titleLocator).toBeVisible({ timeout: 10_000 });

    // ── 6. Удаляем через кнопку «Корзина» в этой строке ──
    // Ищем по slug (он рендерится как «/<slug>» под title).
    const slugCell = page.locator(`text=/${slug}`).first();
    await expect(slugCell).toBeVisible({ timeout: 5_000 });
    const card = slugCell.locator(
      'xpath=ancestor::*[contains(@class,"rounded-xl") and contains(@class,"items-center")][1]',
    );
    await card.locator('button[aria-label="Удалить"]').click();

    await expect(page.locator("text=Удалить работу из портфолио?")).toBeVisible(
      { timeout: 5_000 },
    );

    // Подтверждаем удаление. Заранее подписываемся на:
    //   - success-toast «Работа удалена»;
    //   - error-toast «Не удалось…» / «Некорректный id» (это и был баг
    //     до фикса z.coerce);
    //   - факт исчезновения строки из DOM.
    const deleteSuccessToast = page.locator('text=Работа удалена');
    const deleteErrorToast = page
      .locator('[data-sonner-toast]:has-text("Не удалось"), [data-sonner-toast]:has-text("Некорректный id"), [data-sonner-toast][data-type="error"]')
      .first();
    const titleGone = page.locator(`text=${title}`);

    await page.locator('button:has-text("Удалить")').last().click();

    const delIdx = await Promise.race([
      deleteSuccessToast
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => 0),
      titleGone.first().waitFor({ state: "hidden", timeout: 15_000 }).then(() => 1),
      deleteErrorToast
        .waitFor({ state: "visible", timeout: 15_000 })
        .then(() => 2),
    ]).catch(() => -1);

    if (delIdx === 2 || (await deleteErrorToast.isVisible().catch(() => false))) {
      const errText = await deleteErrorToast.textContent();
      throw new Error(`Удаление упало с ошибкой: ${errText}`);
    }

    // Критическая регрессия: до фикса BIGSERIAL coerce удаление падало
    // ровно с «Некорректный id», и эта строка из DOM никогда бы не ушла.
    await expect(titleGone).toHaveCount(0, { timeout: 10_000 });

    // ── 8. Lifeline-проверка: после reload работа всё ещё удалена. ──
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(`text=${title}`)).toHaveCount(0, {
      timeout: 5_000,
    });
  });
});
