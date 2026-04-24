/**
 * Unit-тесты для Zod-схем `promotionSchema`, `togglePromotionPopupSchema`,
 * `teamMemberSchema`, `reorderTeamSchema` (миграция 006).
 */
import { describe, expect, it } from "vitest";
import {
  promotionSchema,
  togglePromotionPopupSchema,
} from "@/features/admin/schemas/promotions";
import {
  teamMemberSchema,
  reorderTeamSchema,
} from "@/features/admin/schemas/team";

describe("promotionSchema", () => {
  const valid = {
    title: "500 визиток + 500 в подарок",
    body: "При заказе 500 визиток вы получаете ещё 500 бесплатно",
    image_url: null,
    link_url: "/contacts",
    link_text: "Получить расчёт",
    valid_from: null,
    valid_to: null,
    is_active: true,
    show_as_popup: false,
    sort_order: 0,
  };

  it("принимает валидную акцию", () => {
    expect(promotionSchema.safeParse(valid).success).toBe(true);
  });

  it("требует title и body", () => {
    expect(promotionSchema.safeParse({ ...valid, title: "" }).success).toBe(false);
    expect(promotionSchema.safeParse({ ...valid, body: "" }).success).toBe(false);
  });

  it("дефолтит is_active=true и show_as_popup=false", () => {
    const result = promotionSchema.safeParse({
      title: "T",
      body: "B",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
      expect(result.data.show_as_popup).toBe(false);
      expect(result.data.sort_order).toBe(0);
    }
  });

  it("приводит пустые опциональные строки к null", () => {
    const result = promotionSchema.safeParse({
      title: "T",
      body: "B",
      image_url: "   ",
      link_url: "",
      link_text: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.image_url).toBeNull();
      expect(result.data.link_url).toBeNull();
      expect(result.data.link_text).toBeNull();
    }
  });

  it("отрезает body длиной > 5000", () => {
    expect(
      promotionSchema.safeParse({ ...valid, body: "x".repeat(5001) }).success,
    ).toBe(false);
  });

  it("отрезает sort_order < 0", () => {
    expect(promotionSchema.safeParse({ ...valid, sort_order: -1 }).success).toBe(
      false,
    );
  });
});

describe("togglePromotionPopupSchema", () => {
  it("требует булев show_as_popup", () => {
    expect(togglePromotionPopupSchema.safeParse({ show_as_popup: true }).success).toBe(
      true,
    );
    expect(
      togglePromotionPopupSchema.safeParse({ show_as_popup: false }).success,
    ).toBe(true);
    expect(
      togglePromotionPopupSchema.safeParse({ show_as_popup: "yes" }).success,
    ).toBe(false);
    expect(togglePromotionPopupSchema.safeParse({}).success).toBe(false);
  });
});

describe("teamMemberSchema", () => {
  const valid = {
    name: "Александр Иванов",
    role: "Директор",
    photo_url: null,
    bio: null,
    sort_order: 0,
    is_active: true,
  };

  it("принимает валидного сотрудника", () => {
    expect(teamMemberSchema.safeParse(valid).success).toBe(true);
  });

  it("требует name и role непустыми", () => {
    expect(teamMemberSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
    expect(teamMemberSchema.safeParse({ ...valid, role: "" }).success).toBe(false);
  });

  it("отрезает name > 200", () => {
    expect(
      teamMemberSchema.safeParse({ ...valid, name: "x".repeat(201) }).success,
    ).toBe(false);
  });

  it("отрезает bio > 2000", () => {
    expect(
      teamMemberSchema.safeParse({ ...valid, bio: "x".repeat(2001) }).success,
    ).toBe(false);
  });

  it("дефолтит is_active=true и sort_order=0", () => {
    const result = teamMemberSchema.safeParse({ name: "Имя", role: "Роль" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
      expect(result.data.sort_order).toBe(0);
    }
  });
});

describe("reorderTeamSchema", () => {
  it("принимает массив 1..100 положительных id", () => {
    expect(reorderTeamSchema.safeParse({ ids: [1, 2, 3] }).success).toBe(true);
    expect(reorderTeamSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(
      reorderTeamSchema.safeParse({ ids: Array.from({ length: 101 }, (_, i) => i + 1) })
        .success,
    ).toBe(false);
  });

  it("не принимает 0 / отрицательные / нецелые", () => {
    expect(reorderTeamSchema.safeParse({ ids: [0, 1] }).success).toBe(false);
    expect(reorderTeamSchema.safeParse({ ids: [-1] }).success).toBe(false);
    expect(reorderTeamSchema.safeParse({ ids: [1.5] }).success).toBe(false);
  });
});
