/**
 * Unit-тесты для демо-калькулятора (lib/data/catalog-demo.ts → calculateDemoPrice).
 *
 * Это fallback, который срабатывает когда Supabase RPC недоступен. Тестируем
 * все 4 типа формул + min_price + option modifiers.
 *
 * Продуктовые ID берём из SEED:
 *   101 — Визитки (per_tiraj_tier) + параметр paper с modifier'ами
 *   201 — Баннер (per_area)
 *   401 — Световые буквы (per_length)
 *   999 — несуществующий
 */
import { describe, expect, it } from "vitest";
import { calculateDemoPrice } from "@/lib/data/catalog-demo";

describe("calculateDemoPrice — per_tiraj_tier (визитки 101)", () => {
  it("возвращает цену первого тира при тираже 1000", () => {
    const res = calculateDemoPrice(101, { tiraj: 1000 });
    expect(res.success).toBe(true);
    expect(res.total).toBe(1700);
    expect(res.currency).toBe("RUB");
    expect(res.breakdown?.some((b) => b.label === "Тираж")).toBe(true);
  });

  it("поднимается до следующего тира при тираже 2000", () => {
    const res = calculateDemoPrice(101, { tiraj: 2000 });
    expect(res.total).toBe(2900);
  });

  it("использует последний тир при тираже выше максимума", () => {
    const res = calculateDemoPrice(101, { tiraj: 100000 });
    // При 100000 ни один tier t.from >= qty не сработает → fallback на последний
    expect(res.total).toBe(12000);
  });

  it("применяет модификатор глянцевой бумаги (+5%)", () => {
    const res = calculateDemoPrice(101, { tiraj: 1000, paper: "glossy_300" });
    // 1700 * 1.05 = 1785
    expect(res.total).toBe(1785);
  });

  it("применяет модификатор фактурной бумаги (+20%)", () => {
    const res = calculateDemoPrice(101, { tiraj: 1000, paper: "textured_350" });
    // 1700 * 1.20 = 2040
    expect(res.total).toBe(2040);
  });

  it("игнорирует матовую бумагу (базовая, без модификатора)", () => {
    const res = calculateDemoPrice(101, { tiraj: 1000, paper: "matte_300" });
    expect(res.total).toBe(1700);
  });
});

describe("calculateDemoPrice — per_area (баннер 201)", () => {
  it("умножает ширину × высоту × цену за м²", () => {
    const res = calculateDemoPrice(201, { width: 3, height: 2 });
    // 550 * 6 м² = 3300
    expect(res.success).toBe(true);
    expect(res.total).toBe(3300);
  });

  it("работает с дробными размерами", () => {
    const res = calculateDemoPrice(201, { width: 1.5, height: 2 });
    // 550 * 3 = 1650
    expect(res.total).toBe(1650);
  });

  it("применяет min_price при маленькой площади", () => {
    const res = calculateDemoPrice(201, { width: 0.5, height: 0.5 });
    // 550 * 0.25 = 137.5 → < min_price 1500 → 1500
    expect(res.total).toBe(1500);
  });

  it("возвращает breakdown с площадью", () => {
    const res = calculateDemoPrice(201, { width: 4, height: 2.5 });
    const areaRow = res.breakdown?.find((b) => b.label === "Площадь");
    expect(areaRow).toBeDefined();
    expect(String(areaRow?.value)).toContain("10");
  });
});

describe("calculateDemoPrice — per_length (световые буквы 401)", () => {
  it("рассчитывает по периметру (высота × количество)", () => {
    const res = calculateDemoPrice(401, {
      letter_height: 50,
      letters_count: 10,
    });
    // 180 * 50 * 10 = 90000
    expect(res.success).toBe(true);
    expect(res.total).toBe(90000);
  });

  it("применяет min_price когда периметр маленький", () => {
    const res = calculateDemoPrice(401, {
      letter_height: 10,
      letters_count: 1,
    });
    // 180 * 10 = 1800 → < 18000 → 18000
    expect(res.total).toBe(18000);
  });

  it("использует default если параметры не переданы", () => {
    const res = calculateDemoPrice(401, {});
    // default letter_height=50, letters_count=1 в ветке fallback: 50 * 1 * 180 = 9000 → min 18000
    expect(res.success).toBe(true);
    expect(res.total).toBeGreaterThanOrEqual(18000);
  });
});

describe("calculateDemoPrice — edge cases", () => {
  it("возвращает success:false для несуществующего товара", () => {
    const res = calculateDemoPrice(999_999, {});
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("для товара без калькулятора возвращает базовую цену (fixed/quote)", () => {
    // Product 102 = quote (vizitki-designer-paper), у него нет calculator
    const res = calculateDemoPrice(102, {});
    expect(res.success).toBe(true);
    expect(res.total).toBe(6500); // seed price
    expect(res.breakdown?.[0].label).toBe("Базовая стоимость");
  });

  it("total никогда не уходит ниже min_price", () => {
    const res = calculateDemoPrice(201, { width: 0.1, height: 0.1 });
    expect(res.total).toBeGreaterThanOrEqual(1500);
  });

  it("возвращает корректную валюту RUB", () => {
    expect(calculateDemoPrice(101, {}).currency).toBe("RUB");
    expect(calculateDemoPrice(201, {}).currency).toBe("RUB");
    expect(calculateDemoPrice(401, {}).currency).toBe("RUB");
  });

  it("не падает на мусорных параметрах", () => {
    expect(() =>
      calculateDemoPrice(101, { tiraj: "abc" as unknown as number }),
    ).not.toThrow();
    expect(() =>
      calculateDemoPrice(201, { width: -1, height: -1 }),
    ).not.toThrow();
  });
});
