"use client";

import { useEffect, useRef } from "react";
import { useCartStore } from "@/store/cart";
import { trackEvent, EVENTS } from "@/lib/analytics";

interface SuccessCartClearProps {
  orderNumber: string;
}

export default function SuccessCartClear({ orderNumber }: SuccessCartClearProps) {
  const clearCart = useCartStore((s) => s.clearCart);
  const cleared = useRef(false);

  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    clearCart();
    trackEvent(EVENTS.purchase_complete, { orderNumber });
  }, [clearCart, orderNumber]);

  return null;
}
