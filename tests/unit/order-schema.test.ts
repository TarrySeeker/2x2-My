import { describe, expect, it } from "vitest";
import { orderSchema } from "@/lib/checkout/order-schema";

const validItem = {
  productId: 1,
  name: "Визитки 1000 шт.",
  price: 1700,
  quantity: 1,
};

const validPayload = {
  customer: { name: "Иван Иванов", phone: "+79324247740", email: "", isB2B: false },
  delivery: { type: "pickup" as const },
  payment: { method: "cash_on_delivery" as const },
  items: [validItem],
};

describe("orderSchema", () => {
  it("accepts valid retail order (pickup + cash)", () => {
    const result = orderSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("accepts valid B2B order (invoice + company)", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      customer: {
        name: "Сергей Петров",
        phone: "+79044807740",
        email: "info@company.ru",
        isB2B: true,
        company: {
          name: "ООО Рекламный Двор",
          inn: "8601012345",
          kpp: "860101001",
          address: "г. Ханты-Мансийск, ул. Мира 1",
        },
      },
      payment: { method: "invoice" as const },
    });
    expect(result.success).toBe(true);
  });

  it("rejects B2B without company data (superRefine)", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      customer: { name: "Иван", phone: "+79324247740", isB2B: true },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("customer.company");
    }
  });

  it("rejects invalid INN (too short)", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      customer: {
        name: "Иван",
        phone: "+79324247740",
        isB2B: true,
        company: { name: "ООО Тест", inn: "123", kpp: "" },
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const innIssue = result.error.issues.find((i) =>
        i.path.join(".").includes("inn"),
      );
      expect(innIssue).toBeDefined();
    }
  });

  it("rejects courier without delivery address (superRefine)", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      delivery: { type: "courier" as const },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("delivery.address");
    }
  });

  it("accepts courier with delivery address", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      delivery: { type: "courier" as const, address: "ул. Ленина 10, кв. 5" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      items: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const itemsIssue = result.error.issues.find((i) =>
        i.path.includes("items"),
      );
      expect(itemsIssue).toBeDefined();
    }
  });

  it("rejects invalid phone format", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      customer: { name: "Иван", phone: "abc123", isB2B: false },
    });
    expect(result.success).toBe(false);
  });

  it("accepts 12-digit INN (юрлицо ИП)", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      customer: {
        name: "ИП Сидоров",
        phone: "+79324247740",
        isB2B: true,
        company: { name: "ИП Сидоров А.В.", inn: "860112345678" },
      },
      payment: { method: "invoice" as const },
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional fields (installation, utm, comment)", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      installation: { required: true, address: "ул. Парковая 92Б", notes: "2 этаж" },
      utm: { source: "yandex", medium: "cpc" },
      customerComment: "Прошу позвонить до 15:00",
      promoCode: "WELCOME10",
    });
    expect(result.success).toBe(true);
  });

  it("P2-003: promoDiscount is stripped from parsed output (removed from schema)", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      promoDiscount: 500,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("promoDiscount" in result.data).toBe(false);
    }
  });

  it("rejects customerComment over 2000 chars", () => {
    const result = orderSchema.safeParse({
      ...validPayload,
      customerComment: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  describe("delivery CDEK fields (stage 3.3)", () => {
    it("accepts cdek delivery with tariffCode and pointCode", () => {
      const result = orderSchema.safeParse({
        ...validPayload,
        delivery: {
          type: "cdek" as const,
          tariffCode: 136,
          pointCode: "MSK-001",
          pointAddress: "Москва, ул. Ленина 1",
          cityCode: 44,
          cost: 350,
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.delivery.tariffCode).toBe(136);
        expect(result.data.delivery.pointCode).toBe("MSK-001");
        expect(result.data.delivery.pointAddress).toBe("Москва, ул. Ленина 1");
        expect(result.data.delivery.cityCode).toBe(44);
        expect(result.data.delivery.cost).toBe(350);
      }
    });

    it("allows cdek without optional fields", () => {
      const result = orderSchema.safeParse({
        ...validPayload,
        delivery: { type: "cdek" as const },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.delivery.tariffCode).toBeUndefined();
        expect(result.data.delivery.pointCode).toBeUndefined();
      }
    });

    it("rejects negative tariffCode", () => {
      const result = orderSchema.safeParse({
        ...validPayload,
        delivery: { type: "cdek" as const, tariffCode: -1 },
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative cityCode", () => {
      const result = orderSchema.safeParse({
        ...validPayload,
        delivery: { type: "cdek" as const, cityCode: -5 },
      });
      expect(result.success).toBe(false);
    });

    it("accepts zero delivery cost", () => {
      const result = orderSchema.safeParse({
        ...validPayload,
        delivery: { type: "cdek" as const, cost: 0 },
      });
      expect(result.success).toBe(true);
    });

    it("rejects negative delivery cost", () => {
      const result = orderSchema.safeParse({
        ...validPayload,
        delivery: { type: "cdek" as const, cost: -100 },
      });
      expect(result.success).toBe(false);
    });
  });
});
