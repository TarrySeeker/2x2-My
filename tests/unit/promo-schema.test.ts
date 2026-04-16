import { describe, expect, it } from "vitest";
import { promoSchema, promoFilterSchema, promoCodeCheckSchema } from "@/features/admin/schemas/promo";

describe("promoSchema", () => {
  const validFixed = {
    code: "SALE500",
    type: "fixed" as const,
    value: 500,
    is_active: true,
  };

  const validPercent = {
    code: "off20",
    type: "percent" as const,
    value: 20,
    is_active: true,
  };

  it("accepts valid fixed promo", () => {
    const result = promoSchema.safeParse(validFixed);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("SALE500");
      expect(result.data.type).toBe("fixed");
      expect(result.data.value).toBe(500);
    }
  });

  it("accepts valid percent promo", () => {
    const result = promoSchema.safeParse(validPercent);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("OFF20"); // uppercase transform
      expect(result.data.value).toBe(20);
    }
  });

  it("transforms code to uppercase", () => {
    const result = promoSchema.safeParse({ ...validFixed, code: "lowercase" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("LOWERCASE");
    }
  });

  it("rejects code shorter than 3 chars", () => {
    const result = promoSchema.safeParse({ ...validFixed, code: "AB" });
    expect(result.success).toBe(false);
  });

  it("rejects code longer than 20 chars", () => {
    const result = promoSchema.safeParse({
      ...validFixed,
      code: "A".repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it("accepts code of exactly 3 chars", () => {
    const result = promoSchema.safeParse({ ...validFixed, code: "ABC" });
    expect(result.success).toBe(true);
  });

  it("accepts code of exactly 20 chars", () => {
    const result = promoSchema.safeParse({
      ...validFixed,
      code: "A".repeat(20),
    });
    expect(result.success).toBe(true);
  });

  it("rejects percent > 100", () => {
    const result = promoSchema.safeParse({
      ...validPercent,
      value: 101,
    });
    expect(result.success).toBe(false);
  });

  it("rejects percent = 0", () => {
    const result = promoSchema.safeParse({
      ...validPercent,
      value: 0,
    });
    expect(result.success).toBe(false);
  });

  it("accepts percent = 1", () => {
    const result = promoSchema.safeParse({
      ...validPercent,
      value: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts percent = 100", () => {
    const result = promoSchema.safeParse({
      ...validPercent,
      value: 100,
    });
    expect(result.success).toBe(true);
  });

  it("allows fixed value > 100 (not percent-limited)", () => {
    const result = promoSchema.safeParse({
      ...validFixed,
      value: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative value", () => {
    const result = promoSchema.safeParse({
      ...validFixed,
      value: -100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects valid_to < valid_from", () => {
    const result = promoSchema.safeParse({
      ...validFixed,
      valid_from: "2026-06-01",
      valid_to: "2026-05-01",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid_to > valid_from", () => {
    const result = promoSchema.safeParse({
      ...validFixed,
      valid_from: "2026-05-01",
      valid_to: "2026-06-01",
    });
    expect(result.success).toBe(true);
  });

  it("accepts when only valid_from provided", () => {
    const result = promoSchema.safeParse({
      ...validFixed,
      valid_from: "2026-05-01",
      valid_to: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional nullable fields as null", () => {
    const result = promoSchema.safeParse({
      ...validFixed,
      description: null,
      min_order_amount: null,
      max_discount_amount: null,
      max_uses: null,
      valid_from: null,
      valid_to: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("promoFilterSchema", () => {
  it("provides defaults", () => {
    const result = promoFilterSchema.parse({});
    expect(result.status).toBe("all");
    expect(result.page).toBe(1);
    expect(result.per_page).toBe(20);
  });

  it("accepts valid status values", () => {
    for (const status of ["all", "active", "inactive", "expired"]) {
      const result = promoFilterSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = promoFilterSchema.safeParse({ status: "unknown" });
    expect(result.success).toBe(false);
  });
});

describe("promoCodeCheckSchema", () => {
  it("transforms code to uppercase", () => {
    const result = promoCodeCheckSchema.parse({ code: "hello" });
    expect(result.code).toBe("HELLO");
  });

  it("rejects empty code", () => {
    const result = promoCodeCheckSchema.safeParse({ code: "" });
    expect(result.success).toBe(false);
  });
});
