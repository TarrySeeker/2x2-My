/**
 * Unit-тесты для Zod-схем CMS-секций главной (миграция 006).
 *
 * Покрывает все 8 секций (`hero`, `about`, `services`, `promotions`,
 * `portfolio`, `features`, `faq`, `cta`) + helpers (`isValidSectionKey`,
 * `getSectionSchema`).
 *
 * Цель — гарантировать, что server action `updateSectionAction` отбросит
 * заведомо невалидный JSON ДО записи в БД.
 */
import { describe, expect, it } from "vitest";
import {
  SECTION_SCHEMAS,
  SECTION_KEYS,
  isValidSectionKey,
  getSectionSchema,
  heroSectionSchema,
  aboutSectionSchema,
  servicesSectionSchema,
  promotionsSectionSchema,
  portfolioSectionSchema,
  featuresSectionSchema,
  faqSectionSchema,
  ctaSectionSchema,
} from "@/features/admin/schemas/cms";

describe("SECTION_KEYS / isValidSectionKey", () => {
  it("содержит ровно 8 секций", () => {
    expect(SECTION_KEYS).toHaveLength(8);
    expect(SECTION_KEYS).toEqual(
      expect.arrayContaining([
        "hero",
        "about",
        "services",
        "promotions",
        "portfolio",
        "features",
        "faq",
        "cta",
      ]),
    );
  });

  it("isValidSectionKey: true для всех валидных ключей", () => {
    for (const key of SECTION_KEYS) {
      expect(isValidSectionKey(key)).toBe(true);
    }
  });

  it("isValidSectionKey: false для произвольной строки", () => {
    expect(isValidSectionKey("foobar")).toBe(false);
    expect(isValidSectionKey("")).toBe(false);
    expect(isValidSectionKey("HERO")).toBe(false);
  });

  it("getSectionSchema: возвращает соответствующую схему", () => {
    expect(getSectionSchema("hero")).toBe(SECTION_SCHEMAS.hero);
    expect(getSectionSchema("cta")).toBe(SECTION_SCHEMAS.cta);
  });
});

describe("heroSectionSchema", () => {
  it("принимает полностью пустой объект (все поля опциональны)", () => {
    const result = heroSectionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("принимает валидный hero", () => {
    const result = heroSectionSchema.safeParse({
      eyebrow: "Реклама",
      headline_line1: "Реклама,",
      headline_accent: "которая работает",
      headline_line3: "",
      typewriter: "вывески / печать / монтаж",
      subheadline: "Полный цикл — от макета до монтажа",
      cta_primary_text: "Получить расчёт",
      cta_primary_url: "quote_modal",
      cta_secondary_text: "Наши работы",
      cta_secondary_url: "/portfolio",
    });
    expect(result.success).toBe(true);
  });

  it("отрезает headline_line1 длиной > 300", () => {
    const result = heroSectionSchema.safeParse({
      headline_line1: "x".repeat(301),
    });
    expect(result.success).toBe(false);
  });
});

describe("aboutSectionSchema", () => {
  it("требует headline (1..300)", () => {
    expect(aboutSectionSchema.safeParse({ headline: "" }).success).toBe(false);
    expect(aboutSectionSchema.safeParse({ headline: "О нас" }).success).toBe(true);
  });

  it("принимает highlight_card как null", () => {
    const result = aboutSectionSchema.safeParse({
      headline: "О компании",
      highlight_card: null,
    });
    expect(result.success).toBe(true);
  });

  it("принимает highlight_card с полями", () => {
    const result = aboutSectionSchema.safeParse({
      headline: "О компании",
      highlight_card: { text: "Мы вас понимаем", icon: "Heart" },
    });
    expect(result.success).toBe(true);
  });

  it("позволяет до 8 stats и до 10 paragraphs", () => {
    const ok = aboutSectionSchema.safeParse({
      headline: "О",
      paragraphs: Array(10).fill("p"),
      stats: Array(8).fill({ icon: "X", value: 17, suffix: "+", label: "лет" }),
    });
    expect(ok.success).toBe(true);

    const tooMany = aboutSectionSchema.safeParse({
      headline: "О",
      stats: Array(9).fill({ icon: "X", value: 1, label: "lab" }),
    });
    expect(tooMany.success).toBe(false);
  });
});

describe("servicesSectionSchema", () => {
  it("принимает items + also_we_do_items с bullets", () => {
    const result = servicesSectionSchema.safeParse({
      headline: "Услуги",
      items: [
        {
          icon: "Printer",
          title: "Полиграфия",
          description: "Визитки, листовки",
          cta_text: "Заказать",
        },
      ],
      also_we_do_items: [
        {
          icon: "X",
          title: "Также",
          bullets: ["Один", "Два", "Три"],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("дефолтный cta_text = 'Заказать'", () => {
    const result = servicesSectionSchema.safeParse({
      headline: "Услуги",
      items: [{ title: "Без cta_text", icon: "X" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0]!.cta_text).toBe("Заказать");
    }
  });
});

describe("promotionsSectionSchema / portfolioSectionSchema", () => {
  it("требует headline в каждой", () => {
    expect(promotionsSectionSchema.safeParse({ headline: "Акции" }).success).toBe(true);
    expect(promotionsSectionSchema.safeParse({}).success).toBe(false);
    expect(portfolioSectionSchema.safeParse({ headline: "Работы" }).success).toBe(true);
    expect(portfolioSectionSchema.safeParse({}).success).toBe(false);
  });
});

describe("featuresSectionSchema", () => {
  it("принимает до 12 items", () => {
    const result = featuresSectionSchema.safeParse({
      headline: "Преимущества",
      items: Array(12).fill({
        icon: "X",
        title: "T",
        description: "D",
      }),
    });
    expect(result.success).toBe(true);
  });
  it("не принимает 13 items", () => {
    const result = featuresSectionSchema.safeParse({
      headline: "X",
      items: Array(13).fill({ title: "T", icon: "X" }),
    });
    expect(result.success).toBe(false);
  });
});

describe("faqSectionSchema", () => {
  it("принимает до 30 вопросов", () => {
    const result = faqSectionSchema.safeParse({
      headline: "FAQ",
      items: Array(30).fill({ question: "Q?", answer: "A.", emoji: "❓" }),
    });
    expect(result.success).toBe(true);
  });
  it("не принимает 31 вопрос", () => {
    const result = faqSectionSchema.safeParse({
      headline: "FAQ",
      items: Array(31).fill({ question: "Q?", answer: "A." }),
    });
    expect(result.success).toBe(false);
  });
});

describe("ctaSectionSchema", () => {
  it("принимает минимальный валидный объект", () => {
    const result = ctaSectionSchema.safeParse({ headline: "Расскажите о задаче" });
    expect(result.success).toBe(true);
  });

  it("subheadline до 1000 символов", () => {
    expect(
      ctaSectionSchema.safeParse({ headline: "X", subheadline: "x".repeat(1000) })
        .success,
    ).toBe(true);
    expect(
      ctaSectionSchema.safeParse({ headline: "X", subheadline: "x".repeat(1001) })
        .success,
    ).toBe(false);
  });
});
