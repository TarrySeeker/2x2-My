import { describe, expect, it } from "vitest";
import {
  serviceSchema,
  reorderServicesSchema,
} from "@/features/admin/schemas/services";

/**
 * Тесты Zod-схемы для таблицы `services` (миграция 018).
 * Покрывают успешные кейсы и базовые failure-сценарии для самых
 * критичных полей: slug, title, price_from, cover_image (XSS-whitelist),
 * features (массив строк).
 *
 * См. также:
 *   - features/admin/schemas/services.ts — сама схема
 *   - features/admin/schemas/_shared.ts — safeUrl whitelist
 */

const validService = {
  slug: "polygrafiya",
  title: "Полиграфия",
  short_description: "Визитки от 1 700 ₽ за тысячу штук",
  long_description: null,
  price_from: 1700,
  price_unit: "тираж",
  price_label: "от 1 700 ₽",
  icon: "printer",
  cover_image: "/img/pint.png",
  category: "polygraphy",
  href: "/catalog/polygrafiya",
  enabled: true,
  display_order: 10,
  features: ["Срок 1-3 дня", "Дизайн в подарок"],
  seo_title: null,
  seo_description: null,
};

describe("serviceSchema", () => {
  it("принимает валидную услугу со всеми полями", () => {
    const result = serviceSchema.safeParse(validService);
    expect(result.success).toBe(true);
  });

  it("требует title", () => {
    const result = serviceSchema.safeParse({ ...validService, title: "" });
    expect(result.success).toBe(false);
  });

  it("требует slug", () => {
    const result = serviceSchema.safeParse({ ...validService, slug: "" });
    expect(result.success).toBe(false);
  });

  it("отклоняет slug в верхнем регистре", () => {
    const result = serviceSchema.safeParse({
      ...validService,
      slug: "Polygrafiya",
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет slug с пробелами", () => {
    const result = serviceSchema.safeParse({
      ...validService,
      slug: "poly grafiya",
    });
    expect(result.success).toBe(false);
  });

  it("принимает слаг с цифрами и дефисами", () => {
    const result = serviceSchema.safeParse({
      ...validService,
      slug: "service-2025-v2",
    });
    expect(result.success).toBe(true);
  });

  it("принимает price_from = null (по запросу)", () => {
    const result = serviceSchema.safeParse({
      ...validService,
      price_from: null,
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет отрицательную цену", () => {
    const result = serviceSchema.safeParse({
      ...validService,
      price_from: -100,
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет cover_image c javascript: схемой (XSS)", () => {
    const result = serviceSchema.safeParse({
      ...validService,
      cover_image: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });

  it("отклоняет href c javascript: схемой (XSS)", () => {
    const result = serviceSchema.safeParse({
      ...validService,
      href: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });

  it("принимает href = null", () => {
    const result = serviceSchema.safeParse({ ...validService, href: null });
    expect(result.success).toBe(true);
  });

  it("принимает features = null", () => {
    const result = serviceSchema.safeParse({ ...validService, features: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.features).toBeNull();
    }
  });

  it("превращает пустой массив features в null", () => {
    const result = serviceSchema.safeParse({ ...validService, features: [] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.features).toBeNull();
    }
  });

  it("отклоняет более 20 пунктов в features", () => {
    const tooMany = Array.from({ length: 21 }, (_, i) => `f${i}`);
    const result = serviceSchema.safeParse({
      ...validService,
      features: tooMany,
    });
    expect(result.success).toBe(false);
  });

  it("обрезает пробелы в title", () => {
    const result = serviceSchema.safeParse({
      ...validService,
      title: "  Полиграфия  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Полиграфия");
    }
  });

  it("принимает icon в kebab-case", () => {
    const result = serviceSchema.safeParse({
      ...validService,
      icon: "panels-top-left",
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет icon с подозрительными символами", () => {
    const result = serviceSchema.safeParse({
      ...validService,
      icon: "icon.<script>",
    });
    expect(result.success).toBe(false);
  });
});

describe("reorderServicesSchema", () => {
  it("принимает один валидный uuid", () => {
    const result = reorderServicesSchema.safeParse({
      ids: ["00000000-0000-0000-0000-000000000001"],
    });
    expect(result.success).toBe(true);
  });

  it("отклоняет пустой список", () => {
    const result = reorderServicesSchema.safeParse({ ids: [] });
    expect(result.success).toBe(false);
  });

  it("отклоняет невалидные uuid'ы", () => {
    const result = reorderServicesSchema.safeParse({ ids: ["not-uuid"] });
    expect(result.success).toBe(false);
  });
});
