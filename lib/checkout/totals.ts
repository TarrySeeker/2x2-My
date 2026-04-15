export interface TotalsInput {
  items: Array<{ price: number; quantity: number }>;
  deliveryType: "pickup" | "courier" | "cdek";
  installationRequired: boolean;
  promoDiscount: number;
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

  let deliveryCost = 0;
  if (params.deliveryType === "courier") deliveryCost = 500;
  // cdek delivery cost = 0 (placeholder, calculated via CDEK API in stage 3.3)

  const installationCost = 0; // placeholder for future pricing

  const discountAmount = Math.min(params.promoDiscount, subtotal);
  const total = Math.max(0, subtotal + deliveryCost + installationCost - discountAmount);

  return { subtotal, deliveryCost, installationCost, discountAmount, total };
}
