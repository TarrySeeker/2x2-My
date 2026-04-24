export type DeliveryType = "pickup" | "courier_local" | "cdek";

export interface TotalsInput {
  items: Array<{ price: number; quantity: number }>;
  deliveryType: DeliveryType;
  installationRequired: boolean;
  promoDiscount: number;
  /**
   * На чекауте всегда 0 — стоимость доставки фиксируется менеджером
   * после согласования заявки. Параметр оставлен для тестов и будущих
   * расчётов в админке.
   */
  deliveryCost?: number;
}

export interface TotalsResult {
  subtotal: number;
  deliveryCost: number;
  installationCost: number;
  discountAmount: number;
  total: number;
}

export function calculateTotals(params: TotalsInput): TotalsResult {
  const subtotal = params.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const deliveryCost = params.deliveryCost ?? 0;
  const installationCost = 0; // placeholder for future pricing

  const discountAmount = Math.min(params.promoDiscount, subtotal);
  const total = Math.max(
    0,
    subtotal + deliveryCost + installationCost - discountAmount,
  );

  return { subtotal, deliveryCost, installationCost, discountAmount, total };
}
