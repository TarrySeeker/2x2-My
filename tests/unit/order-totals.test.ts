import { describe, expect, it } from "vitest";
import { calculateTotals } from "@/lib/checkout/totals";

describe("calculateTotals", () => {
  it("calculates subtotal from multiple items", () => {
    const result = calculateTotals({
      items: [
        { price: 1700, quantity: 1 },
        { price: 500, quantity: 3 },
      ],
      deliveryType: "pickup",
      installationRequired: false,
      promoDiscount: 0,
    });
    expect(result.subtotal).toBe(3200);
    expect(result.total).toBe(3200);
  });

  it("defaults courier_local delivery cost to 0 (manager calculates after Chain 4a)", () => {
    const result = calculateTotals({
      items: [{ price: 1000, quantity: 2 }],
      deliveryType: "courier_local",
      installationRequired: false,
      promoDiscount: 0,
    });
    expect(result.deliveryCost).toBe(0);
    expect(result.total).toBe(2000);
  });

  it("sets delivery cost to 0 for pickup", () => {
    const result = calculateTotals({
      items: [{ price: 1000, quantity: 1 }],
      deliveryType: "pickup",
      installationRequired: false,
      promoDiscount: 0,
    });
    expect(result.deliveryCost).toBe(0);
    expect(result.total).toBe(1000);
  });

  it("applies promo discount correctly", () => {
    const result = calculateTotals({
      items: [{ price: 2000, quantity: 1 }],
      deliveryType: "pickup",
      installationRequired: false,
      promoDiscount: 300,
    });
    expect(result.discountAmount).toBe(300);
    expect(result.total).toBe(1700);
  });

  it("clamps discount to subtotal (total never negative)", () => {
    const result = calculateTotals({
      items: [{ price: 100, quantity: 1 }],
      deliveryType: "pickup",
      installationRequired: false,
      promoDiscount: 99999,
    });
    expect(result.discountAmount).toBe(100);
    expect(result.total).toBe(0);
  });

  it("sets cdek delivery cost to 0 (placeholder)", () => {
    const result = calculateTotals({
      items: [{ price: 500, quantity: 1 }],
      deliveryType: "cdek",
      installationRequired: false,
      promoDiscount: 0,
    });
    expect(result.deliveryCost).toBe(0);
    expect(result.total).toBe(500);
  });

  it("sets installation cost to 0 (placeholder)", () => {
    const result = calculateTotals({
      items: [{ price: 1000, quantity: 1 }],
      deliveryType: "pickup",
      installationRequired: true,
      promoDiscount: 0,
    });
    expect(result.installationCost).toBe(0);
    expect(result.total).toBe(1000);
  });

  describe("deliveryCost parameter (stage 3.3)", () => {
    it("uses explicit deliveryCost when provided", () => {
      const result = calculateTotals({
        items: [{ price: 2000, quantity: 1 }],
        deliveryType: "cdek",
        installationRequired: false,
        promoDiscount: 0,
        deliveryCost: 350,
      });
      expect(result.deliveryCost).toBe(350);
      expect(result.total).toBe(2350);
    });

    it("overrides courier default when deliveryCost is explicit", () => {
      const result = calculateTotals({
        items: [{ price: 1000, quantity: 1 }],
        deliveryType: "courier_local",
        installationRequired: false,
        promoDiscount: 0,
        deliveryCost: 800,
      });
      expect(result.deliveryCost).toBe(800);
      expect(result.total).toBe(1800);
    });

    it("uses explicit deliveryCost=0 (free delivery)", () => {
      const result = calculateTotals({
        items: [{ price: 5000, quantity: 1 }],
        deliveryType: "cdek",
        installationRequired: false,
        promoDiscount: 0,
        deliveryCost: 0,
      });
      expect(result.deliveryCost).toBe(0);
      expect(result.total).toBe(5000);
    });

    it("applies promoDiscount with deliveryCost", () => {
      const result = calculateTotals({
        items: [{ price: 3000, quantity: 1 }],
        deliveryType: "cdek",
        installationRequired: false,
        promoDiscount: 500,
        deliveryCost: 400,
      });
      expect(result.subtotal).toBe(3000);
      expect(result.deliveryCost).toBe(400);
      expect(result.discountAmount).toBe(500);
      expect(result.total).toBe(2900);
    });

    it("total never goes below 0 when promoDiscount > subtotal + delivery", () => {
      const result = calculateTotals({
        items: [{ price: 100, quantity: 1 }],
        deliveryType: "cdek",
        installationRequired: false,
        promoDiscount: 99999,
        deliveryCost: 200,
      });
      expect(result.discountAmount).toBe(100);
      expect(result.total).toBe(Math.max(0, 100 + 200 - 100));
    });
  });
});
