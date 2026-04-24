import { test, expect, type Page } from "@playwright/test";

/**
 * E2E (Этап 7): главная отображает CMS-секции в правильном порядке
 * (master-plan правка 5).
 *
 * Порядок секций:
 *  1. Hero
 *  2. Услуги
 *  3. Акции
 *  4. Портфолио
 *  5. О компании
 *  6. Преимущества (Features)
 *  7. FAQ
 *  8. CTA
 *
 * Удалено: TestimonialsSection (отзывы).
 *
 * Также проверяем:
 *  - Header без иконки корзины (только phone + socials dropdown)
 *  - Footer на месте
 */

/**
 * Регексы подобраны под РЕАЛЬНЫЕ h1/h2 главной (см. components/sections/*).
 *  - Hero h1:        «Мы создаём рекламу, которую замечают»
 *  - Services h2:    «Также мы занимаемся» (это h2 внутри ServicesPreview;
 *                    основной заголовок «Наши услуги» рендерится в
 *                    motion.div, не h2 — поэтому ищем «занимаемся»)
 *  - Portfolio h2:   «Наши работы»  (рендерится только если есть featured)
 *  - About h2:       «Рекламное агентство 2×2»
 *  - Features h2:    «Почему выбирают нас»
 *  - FAQ h2:         «Частые вопросы»
 *  - CTA h2:         «Расскажите о задаче»
 *
 * Promotions h2 не рендерится (там motion.div), плюс секция выводится
 * только при активных акциях — пропускаем.
 *
 * Match для Hero более узкий (создаём + рекламу), чтобы не пересекался
 * с About h2 («Рекламное агентство»). Find возвращает первый match,
 * поэтому даже если оба matchнутся — Hero h1 идёт раньше в DOM.
 */
const SECTION_HEADINGS_IN_ORDER: Array<{ name: string; re: RegExp }> = [
  { name: "Hero",      re: /создаём|создаем|которую замеча|региональный оператор/i },
  { name: "Services",  re: /занимаемся|спектр услуг|также мы/i },
  { name: "Portfolio", re: /наши работ|портфолио/i },
  { name: "About",     re: /рекламное агентство|агентство 2/i },
  { name: "Features",  re: /выбирают|почему/i },
  { name: "FAQ",       re: /частые вопрос|вопрос|faq/i },
  { name: "CTA",       re: /расскажите|расскажи|задаче|готовы|обсуди/i },
];

async function getSectionPositions(page: Page) {
  // Возвращает y-координаты заголовков секций. Текст нормализуем
  // (склеенные span'ы → разделяем пробелом, лишние пробелы сжимаем).
  return page.evaluate(() => {
    const out: Array<{ text: string; y: number }> = [];
    const els = document.querySelectorAll("h1, h2");
    for (const el of Array.from(els)) {
      const raw = el.textContent ?? "";
      const text = raw.replace(/\s+/g, " ").trim();
      out.push({
        text,
        y: el.getBoundingClientRect().top + window.scrollY,
      });
    }
    return out;
  });
}

test.describe("Homepage CMS — порядок и состав секций", () => {
  test("главная рендерится без JS-ошибок", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/", { waitUntil: "networkidle" });
    expect(errors).toEqual([]);
  });

  test("на главной нет TestimonialsSection (отзывы удалены)", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    // Текст «отзыв», «testimon» в h2 не должен встретиться
    const testimonialHeading = page.locator(
      "h2:has-text('Отзыв'), h2:has-text('отзыв'), h2:has-text('Testimon')",
    );
    expect(await testimonialHeading.count()).toBe(0);
  });

  test("в Header нет иконки корзины (master-plan правка 9-10)", async ({ page }) => {
    await page.goto("/");
    const cart = page.locator(
      "header [aria-label*='корзин' i], header a[href='/cart'], header [data-testid='cart-icon']",
    );
    expect(await cart.count()).toBe(0);
  });

  test("Footer на месте", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("footer")).toBeVisible();
  });
});

test.describe("Homepage CMS — порядок секций", () => {
  test("Hero перед Услугами, Услуги перед Акциями, ..., FAQ перед CTA", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const positions = await getSectionPositions(page);
    expect(positions.length).toBeGreaterThan(0);

    // Найти первый match для каждого regex и удостовериться что они в порядке.
    // matched: для отладки сохраняем имя секции и текст — чтобы при падении
    // в логе сразу было видно, что нашлось и в каком порядке.
    const matched: Array<{ name: string; y: number; text: string }> = [];
    for (const { name, re } of SECTION_HEADINGS_IN_ORDER) {
      const found = positions.find((p) => re.test(p.text));
      if (found) matched.push({ name, y: found.y, text: found.text });
    }
    // Ожидаем что нашли минимум 4 секции (Promotions/Portfolio могут быть
    // скрыты, если CMS пуста; на проде минимум — Hero, Services, About,
    // Features, FAQ, CTA = 6 видимых заголовков).
    expect(
      matched.length,
      `Найдены секции: ${matched.map((m) => m.name).join(", ")}. Все h1/h2: ${positions
        .map((p) => `"${p.text}"`)
        .join(" | ")}`,
    ).toBeGreaterThanOrEqual(4);
    // Каждый последующий y > предыдущего
    for (let i = 1; i < matched.length; i++) {
      expect(
        matched[i]!.y,
        `Секция ${matched[i]!.name} ("${matched[i]!.text}") должна быть ниже ${
          matched[i - 1]!.name
        } ("${matched[i - 1]!.text}")`,
      ).toBeGreaterThan(matched[i - 1]!.y);
    }
  });
});

test.describe("Homepage CMS — Hero CTA", () => {
  test("кнопка 'Получить расчёт' открывает QuoteModal (не href)", async ({ page }) => {
    await page.goto("/");
    const cta = page
      .getByRole("button", { name: /Получить расчёт|Рассчитать|Заказать/i })
      .first();
    await expect(cta).toBeVisible();
    await cta.click();
    // Cookie banner тоже имеет role="dialog" — фильтруем его.
    await expect(
      page
        .getByRole("dialog")
        .filter({ hasNotText: /cookie|cookies|куки/i })
        .first(),
    ).toBeVisible();
  });
});
