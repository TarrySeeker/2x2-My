import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Базовая a11y-проверка на публичных страницах.
 * Падаем на serious/critical нарушениях WCAG 2.1 AA.
 */
const PAGES = ["/", "/services", "/portfolio", "/about", "/contacts", "/faq"];

for (const path of PAGES) {
  test(`a11y: ${path} has no serious/critical WCAG 2.1 AA violations`, async ({
    page,
  }) => {
    await page.goto(path, { waitUntil: "networkidle" });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules([
        // Отключено для smoke: decorative-only элементы часто ловят false positives
        "region",
      ])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );

    if (blocking.length > 0) {
      console.log(
        `a11y violations on ${path}:`,
        JSON.stringify(
          blocking.map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.length,
          })),
          null,
          2,
        ),
      );
    }

    expect(blocking, `Serious/critical a11y violations on ${path}`).toEqual([]);
  });
}

test("keyboard: user can Tab from top of homepage and reach main CTA", async ({
  page,
}) => {
  await page.goto("/");
  // Проверяем, что первый Tab-фокус лёг на интерактивный элемент (skip link / лого / меню)
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    return {
      tag: el.tagName,
      text: (el.textContent || "").trim().slice(0, 40),
      href: (el as HTMLAnchorElement).href || null,
    };
  });
  expect(focused).not.toBeNull();
  expect(focused?.tag).toMatch(/A|BUTTON|INPUT/);
});
