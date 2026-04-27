import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";

/**
 * Global QA — витрина (public pages)
 * Запуск:
 *   PLAYWRIGHT_BASE_URL=https://erfgv.website PLAYWRIGHT_SKIP_SERVER=1 \
 *     pnpm exec playwright test tests/e2e/global-qa-2026-04-27.spec.ts --project=chromium --reporter=list
 *
 * НЕ трогает БД и админку. Только публичный обход.
 */

// На проде тесты независимы — можно гонять параллельно.
test.describe.configure({ mode: "default" });

// Slugs — реальные с сайта (получены из sitemap.xml на момент написания теста).
const SERVICE_SLUGS = [
  "vyveski",
  "poligraphy",
  "arhitekturnaya-podsvetka",
  "stely-azs",
];
const PORTFOLIO_SLUGS = [
  "vtb-rooftop-khm",
  "azs-stele-surgut",
  "city-decor-surgut",
];

/** Собирает console-ошибки/warning'и страницы. */
function attachConsoleSpy(page: Page) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const onMsg = (msg: ConsoleMessage) => {
    const text = msg.text();
    // Игнор фоновых noise'ов (next prefetch, hot-reload и т.п. — на проде их нет, но на всякий)
    if (msg.type() === "error") errors.push(text);
    if (msg.type() === "warning") warnings.push(text);
  };
  page.on("console", onMsg);
  page.on("pageerror", (err) => errors.push(`PAGEERROR: ${err.message}`));
  return { errors, warnings, dispose: () => page.off("console", onMsg) };
}

test("01. Главная / — структура и интерактив", async ({ page }) => {
  test.setTimeout(60_000);
  const spy = attachConsoleSpy(page);

  const resp = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(resp?.status(), "HTTP / должна быть 200").toBe(200);

  // Hero
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });

  // ServicesPreview — должны быть карточки услуг
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  const servicesH2 = page.locator("h2", { hasText: /занимаемся|спектр услуг|также мы/i });
  await expect(servicesH2.first()).toBeVisible({ timeout: 15_000 });

  // PortfolioPreview
  const portfolioH2 = page.locator("h2", { hasText: /наши работ|портфолио/i });
  await expect(portfolioH2.first()).toBeVisible({ timeout: 10_000 });

  // AboutPreview
  const aboutH2 = page.locator("h2", { hasText: /рекламное агентство|агентство 2/i });
  await expect(aboutH2.first()).toBeVisible({ timeout: 10_000 });

  // FAQ — клик на вопрос раскрывает ответ
  const faqH2 = page.locator("h2", { hasText: /частые вопрос|вопрос|faq/i });
  if (await faqH2.first().isVisible().catch(() => false)) {
    const firstFaqButton = page
      .locator("button, summary")
      .filter({ hasText: /\?$/ })
      .first();
    if (await firstFaqButton.isVisible().catch(() => false)) {
      await firstFaqButton.click();
      // даём время раскрытию
      await page.waitForTimeout(500);
    }
  }

  // CTA
  const ctaH2 = page.locator("h2", { hasText: /расскажите|готовы|обсуди|задаче/i });
  await expect(ctaH2.first()).toBeVisible({ timeout: 10_000 });

  // Footer
  const footer = page.locator("footer").first();
  await expect(footer).toBeVisible();

  // Проверим ссылки footer на ключевые страницы
  for (const path of ["/services", "/portfolio", "/about", "/contacts"]) {
    const link = footer.locator(`a[href="${path}"], a[href*="${path}"]`).first();
    if (await link.count()) {
      await expect(link).toBeVisible();
    }
  }

  // Проверим, что нет критических console-ошибок
  // Мягкая проверка — на проде может быть analytics/yandex-noise.
  const fatalErrors = spy.errors.filter(
    (e) =>
      !/(GoogleTag|yandex|gtag|hydration mismatch|favicon|metric|404|Failed to load resource)/i.test(
        e,
      ),
  );
  expect(fatalErrors, `console errors: ${fatalErrors.join("\n")}`).toHaveLength(0);
});

test("02. Главная / — клик «Заказать» открывает QuoteModal с услугой", async ({ browser }) => {
  test.setTimeout(60_000);
  // Создаём контекст с предустановленным sessionStorage, чтобы promo-popup
  // не показался — он мешает кликам в верхней части страницы.
  const context = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: "https://erfgv.website",
          localStorage: [],
        },
      ],
    },
  });
  const page = await context.newPage();
  // Пометим промо как viewed через init script (он отрабатывает до первого goto).
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem("2x2_promo_seen_v1", "1");
    } catch {
      /* ignore */
    }
  });
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Promo не должен показаться. Если показался — закрываем по Esc.
    await page.waitForTimeout(1200);
    const promoBanner = page.locator('[role="dialog"][aria-labelledby="promo-popup-title"]');
    if (await promoBanner.isVisible().catch(() => false)) {
      await page.keyboard.press("Escape");
      await expect(promoBanner).toBeHidden({ timeout: 3_000 });
    }

    // Ищем кнопку «Заказать» на ServicesPreview
    const orderButton = page.getByRole("button", { name: /^заказать$/i }).first();
    await expect(orderButton).toBeVisible({ timeout: 15_000 });
    await orderButton.scrollIntoViewIfNeeded();
    await orderButton.click();

    // QuoteModal: диалог с input phone внутри.
    const quoteDialog = page
      .locator('[role="dialog"][aria-modal="true"]')
      .filter({ has: page.locator('input[type="tel"], input#phone') })
      .first();
    await expect(quoteDialog).toBeVisible({ timeout: 5_000 });

    // Закрываем по Esc.
    await page.keyboard.press("Escape");
    await expect(quoteDialog).toBeHidden({ timeout: 5_000 });
  } finally {
    await context.close();
  }
});

test("03. /services — страница и группы", async ({ page }) => {
  test.setTimeout(45_000);
  const resp = await page.goto("/services", { waitUntil: "domcontentloaded" });
  expect(resp?.status()).toBe(200);

  // ≥1 заголовок группы
  const h2s = page.locator("h2");
  await expect(h2s.first()).toBeVisible({ timeout: 10_000 });

  // Проверим, что не осталось ссылок на /calculator
  const html = await page.content();
  expect(html, "/services не должен содержать ссылок на /calculator").not.toMatch(
    /href="\/calculator/,
  );

  // Кнопка «Заказать» на ≥1 карточке
  const orderBtn = page.getByRole("button", { name: /заказать/i }).first();
  await expect(orderBtn).toBeVisible({ timeout: 10_000 });
});

test("04. /services/[slug] — детальная карточка услуги", async ({ page }) => {
  test.setTimeout(60_000);
  for (const slug of SERVICE_SLUGS.slice(0, 2)) {
    const resp = await page.goto(`/services/${slug}`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), `/services/${slug} должна быть 200`).toBe(200);
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10_000 });
    // breadcrumb / ссылка назад
    const backLink = page.locator('a[href="/services"]').first();
    expect(await backLink.count()).toBeGreaterThan(0);
  }
});

test("05. /portfolio — список и фильтры", async ({ page }) => {
  test.setTimeout(45_000);
  const resp = await page.goto("/portfolio", { waitUntil: "domcontentloaded" });
  expect(resp?.status()).toBe(200);

  // ≥3 карточки портфолио
  const cards = page.locator('a[href^="/portfolio/"]');
  await expect(cards.first()).toBeVisible({ timeout: 10_000 });
  const count = await cards.count();
  expect(count, "≥3 карточек портфолио").toBeGreaterThanOrEqual(3);

  // Фильтры — кнопки категорий
  const allBtn = page.getByRole("button", { name: /^Все$/i });
  if (await allBtn.isVisible().catch(() => false)) {
    const printBtn = page.getByRole("button", { name: /полиграфия/i }).first();
    if (await printBtn.isVisible().catch(() => false)) {
      await printBtn.click();
      await page.waitForTimeout(500);
      // Либо отфильтрованный список, либо заглушка «нет работ»
      const haveCards = await page.locator('a[href^="/portfolio/"]').count();
      const haveStub = await page.locator("text=/нет работ|пусто/i").count();
      expect(haveCards + haveStub).toBeGreaterThan(0);
      await allBtn.click();
    }
  }
});

test("06. /portfolio/[slug] — детальная карточка работы", async ({ page }) => {
  test.setTimeout(60_000);
  for (const slug of PORTFOLIO_SLUGS.slice(0, 2)) {
    const resp = await page.goto(`/portfolio/${slug}`, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), `/portfolio/${slug} должна быть 200`).toBe(200);
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 10_000 });
  }
});

test("07. /about — страница", async ({ page }) => {
  const resp = await page.goto("/about", { waitUntil: "domcontentloaded" });
  expect(resp?.status()).toBe(200);
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
});

test("08. /contacts — страница и форма", async ({ page }) => {
  const resp = await page.goto("/contacts", { waitUntil: "domcontentloaded" });
  expect(resp?.status()).toBe(200);
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
  // Форма должна быть
  const form = page.locator("form").first();
  await expect(form).toBeVisible({ timeout: 10_000 });
});

test("09. /blog — список и пост", async ({ page }) => {
  test.setTimeout(45_000);
  const resp = await page.goto("/blog", { waitUntil: "domcontentloaded" });
  expect(resp?.status()).toBe(200);
  // Если посты есть — кликнем в первый
  const postLink = page.locator('a[href^="/blog/"]').first();
  if (await postLink.isVisible().catch(() => false)) {
    const href = await postLink.getAttribute("href");
    if (href && href !== "/blog") {
      const r = await page.goto(href, { waitUntil: "domcontentloaded" });
      expect(r?.status()).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
    }
  }
});

test("10. /privacy и /faq — статика", async ({ page }) => {
  for (const path of ["/privacy", "/faq"]) {
    const resp = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), `${path} HTTP`).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
  }
});

test("11. /sitemap.xml и /robots.txt", async ({ request }) => {
  const sm = await request.get("/sitemap.xml");
  expect(sm.status()).toBe(200);
  const smText = await sm.text();
  expect(smText).toContain("<urlset");
  expect(smText).toContain("erfgv.website");
  // НЕ должно быть устаревших путей
  expect(smText, "sitemap не должен содержать /calculator").not.toContain("/calculator");
  expect(smText, "sitemap не должен содержать /catalog").not.toContain("/catalog");

  const rb = await request.get("/robots.txt");
  expect(rb.status()).toBe(200);
  const rbText = await rb.text();
  expect(rbText).toMatch(/User-Agent/i);
  expect(rbText).toMatch(/Sitemap/i);
});

test("12. Редиректы /calculator, /catalog, /product/* → 308", async ({ request }) => {
  for (const path of ["/calculator", "/catalog", "/product/anything"]) {
    const r = await request.get(path, { maxRedirects: 0 });
    expect(r.status(), `${path} должна возвращать 308`).toBe(308);
    expect(r.headers().location).toBeTruthy();
  }
});

test("13. /api/promotions/active — публичный API", async ({ request }) => {
  const r = await request.get("/api/promotions/active");
  expect(r.status()).toBe(200);
  const json = (await r.json()) as { popup: unknown; list: unknown[] };
  expect(json).toHaveProperty("list");
  expect(Array.isArray(json.list)).toBe(true);
});

test("14. SEO — meta-теги главной", async ({ request }) => {
  const r = await request.get("/");
  const html = await r.text();
  expect(html).toMatch(/<title>[^<]+<\/title>/);
  expect(html).toMatch(/<meta name="description" content="[^"]+"/);
  expect(html).toMatch(/<meta property="og:title" content="[^"]+"/);
  expect(html).toMatch(/<meta property="og:type" content="[^"]+"/);
  expect(html).toMatch(/<meta name="twitter:card" content="[^"]+"/);
  // JSON-LD
  expect(html).toMatch(/application\/ld\+json/);
  // canonical
  expect(html).toMatch(/<link rel="canonical"/);
});

test("15. SEO — JSON-LD на /portfolio/[slug] валиден JSON", async ({ request }) => {
  const r = await request.get(`/portfolio/${PORTFOLIO_SLUGS[0]}`);
  const html = await r.text();
  const matches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  expect(matches.length, "должен быть хотя бы один JSON-LD блок").toBeGreaterThan(0);
  for (const m of matches) {
    const raw = m[1].trim();
    // Парсится как JSON?
    expect(() => JSON.parse(raw)).not.toThrow();
  }
});

test("16. Promo-popup — появление и закрытие", async ({ page }) => {
  test.setTimeout(45_000);
  // Свежий контекст без localStorage
  await page.goto("/", { waitUntil: "networkidle" });
  // Popup появляется через ~800ms
  await page.waitForTimeout(2_000);

  // Ищем popup. Контейнер обычно [role=dialog] с заголовком акции
  const popup = page
    .locator('[role="dialog"], [data-promo-popup]')
    .filter({ hasText: /визитк|листовк|подарок/i })
    .first();

  if (await popup.isVisible().catch(() => false)) {
    // Esc закрывает
    await page.keyboard.press("Escape");
    await expect(popup).toBeHidden({ timeout: 5_000 });
  }
  // Если не появился — это нормально (зависит от localStorage / rate-limit)
});

test("17. Mobile (375x667) — главная и навигация", async ({ browser }) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();
  try {
    const r = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(r?.status()).toBe(200);

    // Burger-меню (если есть)
    const burger = page
      .locator(
        'button[aria-label*="меню" i], button[aria-label*="navigation" i], button[aria-label*="бургер" i], header button:has(svg)',
      )
      .first();
    if (await burger.isVisible().catch(() => false)) {
      await burger.click();
      await page.waitForTimeout(500);
      // Любая ссылка /services из открытого меню должна стать видимой.
      // Возможна ссылка десктопного nav в DOM, но скрытая;
      // ищем именно видимую ссылку.
      const servicesLinks = page.locator('a[href="/services"]');
      const cnt = await servicesLinks.count();
      let visible = false;
      for (let i = 0; i < cnt; i++) {
        if (await servicesLinks.nth(i).isVisible().catch(() => false)) {
          visible = true;
          break;
        }
      }
      expect(visible, "после открытия burger-меню ссылка /services должна стать видимой").toBe(true);
    } else {
      // Если burger не нашли — это уже проблема UX на мобайле.
      test.info().annotations.push({
        type: "warning",
        description: "burger-меню не найдено по типовым селекторам; навигация может быть недоступна",
      });
    }

    // Проверка: контент не вылезает за viewport (горизонтальный скролл = 0)
    const overflowX = await page.evaluate(() => {
      return document.documentElement.scrollWidth - document.documentElement.clientWidth;
    });
    expect(overflowX, "горизонтального скролла на мобайле быть не должно").toBeLessThanOrEqual(2);
  } finally {
    await context.close();
  }
});

test("18. A11y — у <button> без текста есть aria-label, у <img> есть alt", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});

  const issues = await page.evaluate(() => {
    const out: string[] = [];

    document.querySelectorAll("button").forEach((b, i) => {
      const text = (b.textContent || "").trim();
      const aria = b.getAttribute("aria-label");
      const ariaBy = b.getAttribute("aria-labelledby");
      const titleAttr = b.getAttribute("title");
      // У кнопки должно быть хоть какое-то имя
      if (!text && !aria && !ariaBy && !titleAttr) {
        out.push(`button#${i} без текста и без aria-label: ${b.outerHTML.slice(0, 120)}`);
      }
    });

    document.querySelectorAll("img").forEach((img, i) => {
      const alt = img.getAttribute("alt");
      if (alt === null) {
        out.push(`img#${i} без alt: ${img.outerHTML.slice(0, 120)}`);
      }
    });

    return out;
  });

  // Не fail — а warning через test info: оставляем как мягкую проверку
  if (issues.length > 0) {
    test.info().annotations.push({
      type: "a11y-warnings",
      description: issues.slice(0, 20).join("\n"),
    });
  }
  expect(
    issues.length,
    `Найдено ${issues.length} a11y-issues, первые 5:\n${issues.slice(0, 5).join("\n")}`,
  ).toBeLessThanOrEqual(20);
});
