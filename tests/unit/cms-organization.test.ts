/**
 * @vitest-environment node
 *
 * Unit-тесты для helper'а getOrganization (lib/cms/organization.ts).
 *
 * Проверяем:
 *   1) когда site_settings.organization заполнено — возвращаются
 *      DB-значения (с trim);
 *   2) когда какие-то поля пустые/отсутствуют — fallback на
 *      lib/seo/site.ts (SITE / BUSINESS);
 *   3) когда `getSettingValue` вернул `null` (нет записи в БД) —
 *      fallback на все SITE-константы;
 *   4) area_served и keywords_global нормализуются (пустые/мусорные
 *      записи отфильтровываются, если массив пуст — fallback);
 *   5) founding_year работает как с числом, так и со строкой.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetSettingValue } = vi.hoisted(() => ({
  mockGetSettingValue: vi.fn(),
}));

vi.mock("@/lib/data/settings", () => ({
  getSettingValue: mockGetSettingValue,
  getSetting: vi.fn(),
  listSettings: vi.fn(),
  upsertSetting: vi.fn(),
}));

import { getOrganization } from "@/lib/cms/organization";
import { BUSINESS, SITE } from "@/lib/seo/site";

beforeEach(() => {
  mockGetSettingValue.mockReset();
});

describe("getOrganization", () => {
  it("возвращает все DB-значения, когда они заполнены и валидны", async () => {
    mockGetSettingValue.mockResolvedValueOnce({
      name: "Тестовая компания",
      short_name: "Тест",
      legal_name: "ООО Тест",
      slogan: "Тестовый слоган",
      description: "Длинное тестовое описание",
      short_description: "Короткое тест.",
      locale: "en_US",
      language: "en",
      theme_color: "#000000",
      og_image: "/test-og.png",
      founding_year: 2020,
      price_range: "$$$",
      area_served: ["Москва", "Санкт-Петербург"],
      keywords_global: ["test", "kw"],
    });

    const org = await getOrganization();

    expect(org.name).toBe("Тестовая компания");
    expect(org.short_name).toBe("Тест");
    expect(org.legal_name).toBe("ООО Тест");
    expect(org.slogan).toBe("Тестовый слоган");
    expect(org.description).toBe("Длинное тестовое описание");
    expect(org.short_description).toBe("Короткое тест.");
    expect(org.locale).toBe("en_US");
    expect(org.language).toBe("en");
    expect(org.theme_color).toBe("#000000");
    expect(org.og_image).toBe("/test-og.png");
    expect(org.founding_year).toBe(2020);
    expect(org.price_range).toBe("$$$");
    expect(org.area_served).toEqual(["Москва", "Санкт-Петербург"]);
    expect(org.keywords_global).toEqual(["test", "kw"]);
  });

  it("использует SITE/BUSINESS fallback, когда в БД пусто (null/undefined)", async () => {
    // Сценарий 1: getSettingValue вернул пустой объект (после JSON-парсинга).
    mockGetSettingValue.mockResolvedValueOnce({});

    const org = await getOrganization();

    expect(org.name).toBe(SITE.name);
    expect(org.short_name).toBe(SITE.shortName);
    expect(org.legal_name).toBe(SITE.legalName);
    expect(org.slogan).toBe(SITE.slogan);
    expect(org.description).toBe(SITE.description);
    expect(org.short_description).toBe(SITE.shortDescription);
    expect(org.locale).toBe(SITE.locale);
    expect(org.language).toBe(SITE.language);
    expect(org.theme_color).toBe(SITE.themeColor);
    expect(org.og_image).toBe(SITE.ogImage);
    expect(org.founding_year).toBe(BUSINESS.foundingYear);
    expect(org.price_range).toBe(BUSINESS.priceRange);
    expect(org.area_served).toEqual([...BUSINESS.areaServed]);
    expect(org.keywords_global).toEqual([...SITE.keywords]);
  });

  it("заменяет пустые/whitespace-only поля на fallback", async () => {
    mockGetSettingValue.mockResolvedValueOnce({
      name: "  ", // whitespace → fallback
      short_name: "", // empty → fallback
      slogan: "Нормальный слоган",
      description: null, // null → fallback
      og_image: undefined, // undefined → fallback
    });

    const org = await getOrganization();

    expect(org.name).toBe(SITE.name);
    expect(org.short_name).toBe(SITE.shortName);
    expect(org.slogan).toBe("Нормальный слоган");
    expect(org.description).toBe(SITE.description);
    expect(org.og_image).toBe(SITE.ogImage);
  });

  it("триммит whitespace вокруг валидных строк", async () => {
    mockGetSettingValue.mockResolvedValueOnce({
      name: "  Компания ",
      slogan: "\t Слоган\n",
    });

    const org = await getOrganization();

    expect(org.name).toBe("Компания");
    expect(org.slogan).toBe("Слоган");
  });

  it("парсит founding_year как число, так и строку", async () => {
    mockGetSettingValue.mockResolvedValueOnce({
      founding_year: "2018",
    });
    let org = await getOrganization();
    expect(org.founding_year).toBe(2018);

    mockGetSettingValue.mockResolvedValueOnce({
      founding_year: 2010,
    });
    org = await getOrganization();
    expect(org.founding_year).toBe(2010);

    mockGetSettingValue.mockResolvedValueOnce({
      founding_year: "не число",
    });
    org = await getOrganization();
    expect(org.founding_year).toBe(BUSINESS.foundingYear);
  });

  it("фильтрует мусор в area_served и фолбэкает, если в итоге пусто", async () => {
    mockGetSettingValue.mockResolvedValueOnce({
      area_served: [null, "", 42, "  Сургут  ", "  ", "Тюмень"],
    });
    const org = await getOrganization();
    expect(org.area_served).toEqual(["Сургут", "Тюмень"]);

    mockGetSettingValue.mockResolvedValueOnce({
      area_served: [null, "", "  "],
    });
    const org2 = await getOrganization();
    expect(org2.area_served).toEqual([...BUSINESS.areaServed]);
  });

  it("фильтрует мусор в keywords_global", async () => {
    mockGetSettingValue.mockResolvedValueOnce({
      keywords_global: ["  слово1 ", null, "слово2", "", { x: 1 }],
    });
    const org = await getOrganization();
    expect(org.keywords_global).toEqual(["слово1", "слово2"]);
  });

  it("не падает, если значения вообще нет (getSettingValue вернул дефолтный {})", async () => {
    // Имитируем поведение getSettingValue с пустым {} как fallback.
    mockGetSettingValue.mockResolvedValueOnce({});
    const org = await getOrganization();
    expect(org.name).toBe(SITE.name);
    expect(org.area_served.length).toBeGreaterThan(0);
  });
});
