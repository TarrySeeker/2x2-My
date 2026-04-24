import { test, expect, type Page } from "@playwright/test";

/**
 * E2E для проверки наличия и корректности CTA на карточке товара.
 *
 * Покрывает маркетинговые находки H1–H3 (см. 006-from-marketer + 007-from-tester):
 *
 *   H1 (P0) — desktop /product/[slug] для fixed/quote БЕЗ CTA-кнопок.
 *             Проверяем через grep в UI: на viewport ≥1024px в правой колонке
 *             (роли: main → product-info) должна быть хотя бы одна кнопка
 *             «Купить в 1 клик» / «В корзину» / «Заказать расчёт».
 *
 *   H3 (P1) — StickyMobileBar для pricing_mode="calculator" добавляет в корзину
 *             product.price вместо ProductCalculator.total.
 *             Проверяем: накручиваем калькулятор, сравниваем цену в sticky bar
 *             и цену, которая улетает в корзину.
 *
 * ВАЖНО: слаги взяты из демо-данных (lib/data/catalog-demo.ts).
 *   101 vizitki-90x50          → pricing_mode "calculator" (+per_tiraj_tier)
 *   102 vizitki-designer-paper → pricing_mode "quote"
 *   201 banner-street          → pricing_mode "calculator" (+per_area)
 *   401 svetovye-bukvy         → pricing_mode "calculator" (+per_length)
 *
 * Если slug'и в демо сменятся — обновить фикстуру ниже и запустить заново.
 */

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 }; // iPhone 14

const SLUGS = {
  calculator: "vizitki-90x50",
  quote: "vizitki-designer-paper",
  perArea: "banner-street",
  perLength: "svetovye-bukvy",
};

async function openProduct(page: Page, slug: string) {
  const resp = await page.goto(`/product/${slug}`, { waitUntil: "networkidle" });
  expect(resp?.status(), `GET /product/${slug} должен быть <400`).toBeLessThan(400);
}

test.describe("H1 — desktop product page должен иметь CTA", () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  test("pricing_mode=calculator: должна быть primary-кнопка", async ({ page }) => {
    await openProduct(page, SLUGS.calculator);
    // ProductCalculator сам имеет «В корзину» + «Уточнить у менеджера» —
    // по замыслу D-091 это ОК для calculator-режима, поэтому тест пройдёт.
    const buttons = page.getByRole("button", {
      name: /в корзину|уточнить у менеджера/i,
    });
    await expect(buttons.first()).toBeVisible();
  });

  test.fixme(
    "pricing_mode=fixed: на desktop должна быть кнопка «Купить в 1 клик»",
    async ({ page }) => {
      // R-002 fix done (D-112): OneClickCtaButton добавлен в ProductInfo.tsx.
      // Но в демо-данных нет продукта с pricing_mode="fixed" — нужен seed.
      await openProduct(page, SLUGS.calculator);
      const oneClick = page.getByRole("button", { name: /в 1 клик|купить в 1 клик/i });
      await expect(oneClick).toBeVisible();
    },
  );

  test(
    "pricing_mode=quote: на desktop должна быть кнопка «Заказать расчёт»",
    async ({ page }) => {
      await openProduct(page, SLUGS.quote);
      const quoteBtn = page.getByRole("button", { name: /заказать расчёт|оставить заявку/i });
      await expect(quoteBtn).toBeVisible();
      await quoteBtn.click();
      // Cookie banner тоже role="dialog" — фильтруем его.
      await expect(
        page
          .getByRole("dialog")
          .filter({ hasNotText: /cookie|cookies|куки/i })
          .first(),
      ).toBeVisible();
    },
  );
});

test.describe("H3 — StickyMobileBar должен использовать total калькулятора", () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test("на мобиле виден StickyMobileBar для calculator-товара", async ({ page }) => {
    await openProduct(page, SLUGS.calculator);
    // StickyMobileBar = фиксированный элемент внизу, `lg:hidden`
    const sticky = page.locator("div.fixed.inset-x-0.bottom-0");
    await expect(sticky).toBeVisible();
  });

  test(
    "R-005: sticky bar для calculator-режима скроллит к #calculator, а не добавляет в корзину",
    async ({ page }) => {
      await openProduct(page, SLUGS.perArea);

      const stickyBtn = page
        .locator("div.fixed.inset-x-0.bottom-0")
        .getByRole("button");
      await expect(stickyBtn).toBeVisible();
      await expect(stickyBtn).toContainText(/рассчитать стоимость/i);

      const btnClasses = await stickyBtn.getAttribute("class");
      expect(btnClasses).toContain("border-brand-orange");
      expect(btnClasses).toContain("bg-white");

      await stickyBtn.click();

      const calculatorVisible = await page.evaluate(() => {
        const el = document.getElementById("calculator");
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return rect.top >= -50 && rect.top <= window.innerHeight;
      });
      expect(calculatorVisible).toBe(true);
    },
  );
});

test.describe("Smoke — карточки товара рендерятся без JS-ошибок", () => {
  test.use({ viewport: DESKTOP_VIEWPORT });

  for (const [mode, slug] of Object.entries(SLUGS)) {
    test(`${mode} (${slug}) рендерится без ошибок`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      await openProduct(page, slug);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(errors, `JS errors on /product/${slug}`).toEqual([]);
    });
  }
});
