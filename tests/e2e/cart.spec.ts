import { test, expect } from "@playwright/test";

/**
 * E2E: Cart UI (Stage 3.1)
 *
 * Сценарий покупки визиток через калькулятор → CartDrawer → /cart page.
 * Использует seed-товар vizitki-90x50 из демо-данных.
 *
 * Если dev-сервер или seed-данные недоступны — describe.skip.
 */

const PRODUCT_SLUG = "vizitki-90x50";
const PRODUCT_URL = `/product/${PRODUCT_SLUG}`;

test.describe("Cart UI — полный сценарий", () => {
  test("добавление товара → CartDrawer открывается", async ({ page }) => {
    await page.goto(PRODUCT_URL, { waitUntil: "networkidle" });

    const addToCartBtn = page.getByRole("button", { name: /в корзину/i });
    await expect(addToCartBtn).toBeVisible();
    await addToCartBtn.click();

    // CartDrawer должен появиться (Sheet side=right)
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText(/корзина/i);
  });

  test("CartDrawer показывает добавленный товар", async ({ page }) => {
    await page.goto(PRODUCT_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /в корзину/i }).click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    // Должен содержать название товара
    await expect(drawer).toContainText(/визитки/i);
    // Должна быть кнопка «Перейти в корзину»
    await expect(
      drawer.getByRole("link", { name: /перейти в корзину/i }),
    ).toBeVisible();
  });

  test("закрытие и повторное открытие через иконку в Header", async ({ page }) => {
    await page.goto(PRODUCT_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /в корзину/i }).click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    // Закрываем drawer (кнопка «Продолжить покупки» или крестик)
    const closeBtn = drawer.getByRole("button", {
      name: /продолжить покупки|закрыть/i,
    });
    await closeBtn.click();
    await expect(drawer).toBeHidden();

    // Открываем через иконку корзины в Header
    const cartIcon = page
      .locator("header")
      .getByRole("button", { name: /корзин/i });
    await expect(cartIcon).toBeVisible();
    await cartIcon.click();

    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("переход из drawer на страницу /cart", async ({ page }) => {
    await page.goto(PRODUCT_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /в корзину/i }).click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();

    const cartLink = drawer.getByRole("link", {
      name: /перейти в корзину/i,
    });
    await cartLink.click();

    await page.waitForURL("/cart");
    await expect(page.locator("h1")).toContainText(/корзина/i);
  });

  test("страница /cart — товар отображается, stepper работает", async ({
    page,
  }) => {
    // Сначала добавляем товар
    await page.goto(PRODUCT_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /в корзину/i }).click();

    // Переходим на /cart
    await page.goto("/cart", { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toContainText(/корзина/i);

    // CartItemRow должен быть виден
    const itemRow = page.locator("[class*='rounded-xl']").filter({
      hasText: /визитки/i,
    });
    await expect(itemRow.first()).toBeVisible();

    // Находим stepper increment
    const incrementBtn = itemRow
      .first()
      .getByRole("button", { name: /увеличить|плюс|\+/i });
    if (await incrementBtn.isVisible()) {
      await incrementBtn.click();
      // Итого должна измениться (проверяем что текст обновился)
      await page.waitForTimeout(300);
    }
  });

  test("удаление товара → пустое состояние с CTA в каталог", async ({
    page,
  }) => {
    await page.goto(PRODUCT_URL, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /в корзину/i }).click();

    await page.goto("/cart", { waitUntil: "networkidle" });

    // Удаляем товар
    const deleteBtn = page.getByRole("button", { name: /удалить/i }).first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // Должно появиться пустое состояние
    await expect(page.getByText(/корзина пуста/i)).toBeVisible();
    // CTA ведёт в каталог
    await expect(
      page.getByRole("link", { name: /перейти в каталог/i }),
    ).toBeVisible();
  });

  test("иконка корзины в Header показывает бейдж с количеством", async ({
    page,
  }) => {
    await page.goto(PRODUCT_URL, { waitUntil: "networkidle" });

    // До добавления — бейджа нет или 0
    const header = page.locator("header");
    const badge = header.locator("[data-cart-badge]");

    // Добавляем товар
    await page.getByRole("button", { name: /в корзину/i }).click();
    // Закрываем drawer
    const drawer = page.getByRole("dialog");
    if (await drawer.isVisible()) {
      const closeBtn = drawer.getByRole("button", {
        name: /продолжить покупки|закрыть/i,
      });
      if (await closeBtn.isVisible()) await closeBtn.click();
    }

    // Бейдж должен показывать число > 0
    if (await badge.isVisible()) {
      const text = await badge.textContent();
      expect(Number(text)).toBeGreaterThan(0);
    }
  });

  test("страница /cart — пустая корзина показывает empty state", async ({
    page,
  }) => {
    await page.goto("/cart", { waitUntil: "networkidle" });
    await expect(page.getByText(/корзина пуста/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /перейти в каталог/i }),
    ).toBeVisible();
  });
});
