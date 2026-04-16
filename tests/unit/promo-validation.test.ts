import { describe, it, expect, vi, beforeEach } from "vitest";

interface PromoCode {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  applies_to_category_ids: number[];
  applies_to_product_ids: number[];
}

interface PromoResult {
  promoDiscount: number;
  promoCodeId: number | null;
}

function verifyPromoCode(
  promo: PromoCode | null,
  subtotal: number,
): PromoResult {
  if (!promo) {
    return { promoDiscount: 0, promoCodeId: null };
  }

  if (!promo.is_active) {
    return { promoDiscount: 0, promoCodeId: null };
  }

  const now = new Date().toISOString();
  if (promo.valid_from && promo.valid_from > now) {
    return { promoDiscount: 0, promoCodeId: null };
  }
  if (promo.valid_to && promo.valid_to < now) {
    return { promoDiscount: 0, promoCodeId: null };
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return { promoDiscount: 0, promoCodeId: null };
  }

  if (promo.min_order_amount !== null && subtotal < promo.min_order_amount) {
    return { promoDiscount: 0, promoCodeId: null };
  }

  let discount = 0;
  if (promo.type === "percent") {
    discount = Math.round((subtotal * promo.value) / 100);
  } else {
    discount = promo.value;
  }

  if (promo.max_discount_amount !== null && discount > promo.max_discount_amount) {
    discount = promo.max_discount_amount;
  }

  discount = Math.min(discount, subtotal);

  return { promoDiscount: discount, promoCodeId: promo.id };
}

describe("promo code validation", () => {
  const basePromo: PromoCode = {
    id: 1,
    code: "SALE10",
    type: "percent",
    value: 10,
    min_order_amount: null,
    max_discount_amount: null,
    max_uses: null,
    used_count: 0,
    is_active: true,
    valid_from: null,
    valid_to: null,
    applies_to_category_ids: [],
    applies_to_product_ids: [],
  };

  it("applies percent promo correctly", () => {
    const result = verifyPromoCode(basePromo, 10000);
    expect(result.promoDiscount).toBe(1000);
    expect(result.promoCodeId).toBe(1);
  });

  it("applies fixed promo correctly", () => {
    const promo = { ...basePromo, type: "fixed" as const, value: 500 };
    const result = verifyPromoCode(promo, 10000);
    expect(result.promoDiscount).toBe(500);
    expect(result.promoCodeId).toBe(1);
  });

  it("rejects expired promo (valid_to in the past)", () => {
    const promo = {
      ...basePromo,
      valid_to: "2020-01-01T00:00:00.000Z",
    };
    const result = verifyPromoCode(promo, 10000);
    expect(result.promoDiscount).toBe(0);
    expect(result.promoCodeId).toBeNull();
  });

  it("rejects future promo (valid_from in the future)", () => {
    const promo = {
      ...basePromo,
      valid_from: "2099-01-01T00:00:00.000Z",
    };
    const result = verifyPromoCode(promo, 10000);
    expect(result.promoDiscount).toBe(0);
    expect(result.promoCodeId).toBeNull();
  });

  it("rejects inactive promo", () => {
    const promo = { ...basePromo, is_active: false };
    const result = verifyPromoCode(promo, 10000);
    expect(result.promoDiscount).toBe(0);
    expect(result.promoCodeId).toBeNull();
  });

  it("rejects promo with exceeded max_uses", () => {
    const promo = { ...basePromo, max_uses: 5, used_count: 5 };
    const result = verifyPromoCode(promo, 10000);
    expect(result.promoDiscount).toBe(0);
    expect(result.promoCodeId).toBeNull();
  });

  it("rejects promo when subtotal below min_order_amount", () => {
    const promo = { ...basePromo, min_order_amount: 5000 };
    const result = verifyPromoCode(promo, 3000);
    expect(result.promoDiscount).toBe(0);
    expect(result.promoCodeId).toBeNull();
  });

  it("accepts promo when subtotal equals min_order_amount", () => {
    const promo = { ...basePromo, min_order_amount: 5000 };
    const result = verifyPromoCode(promo, 5000);
    expect(result.promoDiscount).toBe(500);
    expect(result.promoCodeId).toBe(1);
  });

  it("caps discount at max_discount_amount", () => {
    const promo = { ...basePromo, value: 50, max_discount_amount: 2000 };
    const result = verifyPromoCode(promo, 10000);
    expect(result.promoDiscount).toBe(2000);
  });

  it("caps discount at subtotal (no negative totals)", () => {
    const promo = { ...basePromo, type: "fixed" as const, value: 15000 };
    const result = verifyPromoCode(promo, 10000);
    expect(result.promoDiscount).toBe(10000);
  });

  it("returns zero for null promo", () => {
    const result = verifyPromoCode(null, 10000);
    expect(result.promoDiscount).toBe(0);
    expect(result.promoCodeId).toBeNull();
  });

  it("accepts promo with used_count below max_uses", () => {
    const promo = { ...basePromo, max_uses: 10, used_count: 9 };
    const result = verifyPromoCode(promo, 10000);
    expect(result.promoDiscount).toBe(1000);
    expect(result.promoCodeId).toBe(1);
  });
});
