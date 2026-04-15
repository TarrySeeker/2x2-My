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

  it("adds 500 RUB delivery cost for courier", () => {
    const result = calculateTotals({
      items: [{ price: 1000, quantity: 2 }],
      deliveryType: "courier",
      installationRequired: false,
      promoDiscount: 0,
    });
    expect(result.deliveryCost).toBe(500);
    expect(result.total).toBe(2500);
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
});
