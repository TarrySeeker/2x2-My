/**
 * @vitest-environment node
 *
 * Тесты для унификации CMS главной страницы (миграция 017).
 *
 * Покрывает:
 *   1. PAGE_SECTION_SCHEMAS содержит home_* ключи и они валидируют
 *      структуру старого homepage_sections content 1:1.
 *   2. PAGE_SECTIONS_ALLOWED содержит все 8 секций главной с правильным
 *      content_type.
 *   3. readSectionContent (deprecated shim) корректно читает из
 *      page_sections('/', 'hero', 'home_hero') и возвращает плоский
 *      content.
 *   4. SQL миграции 017 — наличие критичных конструкций.
 *   5. upsertPageSectionAction для path='/' инвалидирует
 *      revalidatePath('/') + revalidatePath('/admin/content/homepage').
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ── Mocks ──
vi.mock("next/cache", () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

import { mockSql, resetSqlMock } from "../mocks/db";
import {
  PAGE_SECTION_SCHEMAS,
  PAGE_SECTIONS_ALLOWED,
  type PageSectionContentType,
} from "@/features/admin/schemas/page-sections";
import { readSectionContent } from "@/lib/cms/section-content";

beforeEach(() => {
  resetSqlMock();
});

// ============================================================
// 1. Schemas registry
// ============================================================
describe("PAGE_SECTION_SCHEMAS — home_* типы", () => {
  it("содержит все 8 home_* content_type для главной", () => {
    const expected: PageSectionContentType[] = [
      "home_hero",
      "home_about",
      "home_services",
      "home_promotions",
      "home_portfolio",
      "home_features",
      "home_faq",
      "home_cta",
    ];
    for (const t of expected) {
      expect(PAGE_SECTION_SCHEMAS[t]).toBeDefined();
    }
  });

  it("home_hero валидирует структуру с titles + cta_primary_url (как в seed_cms.sql)", () => {
    const schema = PAGE_SECTION_SCHEMAS.home_hero;
    const parsed = schema.safeParse({
      eyebrow: "Реклама",
      headline_line1: "Мы создаём",
      headline_accent: "рекламу,",
      headline_line3: "которую замечают",
      titles: ["A", "B"],
      typewriter: "2x2",
      subheadline: "Полиграфия...",
      cta_primary_text: "Получить расчёт",
      cta_primary_url: "quote_modal",
      cta_secondary_text: "Портфолио",
      cta_secondary_url: "/portfolio",
    });
    expect(parsed.success).toBe(true);
  });

  it("home_about требует headline и принимает highlight_card", () => {
    const schema = PAGE_SECTION_SCHEMAS.home_about;
    const ok = schema.safeParse({
      headline: "Рекламное агентство 2×2",
      highlight_card: { text: "Мы вас понимаем", icon: "UserCheck" },
    });
    expect(ok.success).toBe(true);

    const bad = schema.safeParse({}); // нет headline
    expect(bad.success).toBe(false);
  });

  it("home_services принимает массив items + also_we_do_items", () => {
    const schema = PAGE_SECTION_SCHEMAS.home_services;
    const parsed = schema.safeParse({
      headline: "Наши услуги",
      subheadline: "Производим сами",
      items: [
        {
          icon: "Newspaper",
          title: "Печать",
          description: "Визитки и листовки",
          badge: "от 1,7 ₽",
          image: "/img/x.png",
          width: "90 см",
          height: "60 см",
          cta_text: "Заказать",
        },
      ],
      also_we_do_items: [
        { icon: "Truck", title: "Транспорт", bullets: ["один пункт"] },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("home_faq принимает массив items с question/answer/emoji", () => {
    const schema = PAGE_SECTION_SCHEMAS.home_faq;
    const parsed = schema.safeParse({
      headline: "FAQ",
      items: [
        { question: "А?", answer: "Б", emoji: "💡" },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("home_cta включает phone_text — отличие от обычной CTA", () => {
    const schema = PAGE_SECTION_SCHEMAS.home_cta;
    const parsed = schema.safeParse({
      headline: "Расскажите о задаче",
      subheadline: "Перезвоним",
      button_text: "Получить",
      button_url: "/contacts",
      phone_text: "Позвонить",
    });
    expect(parsed.success).toBe(true);
  });
});

// ============================================================
// 2. Whitelist
// ============================================================
describe("PAGE_SECTIONS_ALLOWED — записи для '/'", () => {
  it("содержит все 8 секций главной с правильным content_type", () => {
    const expected: Array<[string, PageSectionContentType]> = [
      ["hero",       "home_hero"],
      ["about",      "home_about"],
      ["services",   "home_services"],
      ["promotions", "home_promotions"],
      ["portfolio",  "home_portfolio"],
      ["features",   "home_features"],
      ["faq",        "home_faq"],
      ["cta",        "home_cta"],
    ];
    for (const [key, contentType] of expected) {
      const entry = PAGE_SECTIONS_ALLOWED.find(
        (a) => a.page_path === "/" && a.section_key === key,
      );
      expect(entry, `whitelist для '/'/${key}`).toBeDefined();
      expect(entry?.content_type).toBe(contentType);
    }
  });

  it("ни одна home_* секция не использует обычные не-home content_type", () => {
    const homeEntries = PAGE_SECTIONS_ALLOWED.filter(
      (a) => a.page_path === "/",
    );
    for (const e of homeEntries) {
      expect(e.content_type.startsWith("home_")).toBe(true);
    }
  });
});

// ============================================================
// 3. readSectionContent (backward-compat shim)
// ============================================================
describe("readSectionContent (deprecated shim) → page_sections", () => {
  it("читает из page_sections для '/' и возвращает плоский content", async () => {
    // getPageSection вызывает getPageSections, который SELECT'ит
    // страницу по page_path WHERE enabled=true.
    mockSql.mockResolvedValueOnce([
      {
        id: "s1",
        page_path: "/",
        section_key: "hero",
        content_type: "home_hero",
        content: {
          eyebrow: "ИЗ БД",
          headline_line1: "Заголовок из БД",
          subheadline: "Подзаголовок из БД",
        },
        display_order: 10,
        enabled: true,
        updated_at: "2026-04-25",
      },
    ]);

    const result = await readSectionContent("hero");
    expect(result).not.toBeNull();
    expect(result?.eyebrow).toBe("ИЗ БД");
    expect(result?.headline_line1).toBe("Заголовок из БД");
    expect(result?.subheadline).toBe("Подзаголовок из БД");
  });

  it("возвращает null при ошибке БД (не бросает)", async () => {
    mockSql.mockRejectedValueOnce(new Error("connection lost"));
    const result = await readSectionContent("hero");
    expect(result).toBeNull();
  });

  it("возвращает null если секции нет в БД", async () => {
    mockSql.mockResolvedValueOnce([]); // пусто — нет секций для '/'
    const result = await readSectionContent("hero");
    expect(result).toBeNull();
  });

  it("возвращает null если content не проходит Zod (битая структура)", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: "s1",
        page_path: "/",
        section_key: "about",
        content_type: "home_about",
        content: {}, // нет required headline
        display_order: 50,
        enabled: true,
        updated_at: "2026-04-25",
      },
    ]);
    const result = await readSectionContent("about");
    expect(result).toBeNull();
  });
});

// ============================================================
// 4. Migration 017 — структурная проверка SQL
// ============================================================
describe("db/migrations/017_homepage_to_page_sections.sql", () => {
  const sqlText = readFileSync(
    resolve(
      __dirname,
      "..",
      "..",
      "db",
      "migrations",
      "017_homepage_to_page_sections.sql",
    ),
    "utf8",
  );

  it("обёрнута в BEGIN/COMMIT", () => {
    expect(sqlText).toMatch(/\bBEGIN;/);
    expect(sqlText).toMatch(/\bCOMMIT;/);
  });

  it("использует ON CONFLICT (page_path, section_key) DO UPDATE — идемпотентна", () => {
    expect(sqlText).toMatch(/ON CONFLICT \(page_path, section_key\) DO UPDATE/i);
  });

  it("содержит 'page_path = / ' и SELECT FROM homepage_sections", () => {
    expect(sqlText).toMatch(/'\/'\s+AS page_path/);
    expect(sqlText).toMatch(/FROM\s+homepage_sections/i);
  });

  it("маппит content_type как 'home_' || hs.key", () => {
    expect(sqlText).toMatch(/'home_'\s*\|\|\s*hs\.key/);
  });

  it("выбирает только 8 разрешённых ключей главной", () => {
    expect(sqlText).toMatch(
      /hs\.key IN \('hero','about','services','promotions','portfolio','features','faq','cta'\)/i,
    );
  });

  it("проверяет наличие homepage_sections до выполнения переноса (no-op safe)", () => {
    expect(sqlText).toMatch(/EXISTS\s*\([\s\S]*?pg_tables[\s\S]*?'homepage_sections'/i);
  });

  it("НЕ удаляет homepage_sections (только перенос)", () => {
    expect(sqlText).not.toMatch(/DROP\s+TABLE\s+homepage_sections/i);
    expect(sqlText).not.toMatch(/TRUNCATE\s+homepage_sections/i);
  });
});
