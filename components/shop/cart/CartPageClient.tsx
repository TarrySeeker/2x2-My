"use client";

import { useEffect } from "react";
import CartEmptyState from "./CartEmptyState";
import CartItemRow from "./CartItemRow";
import CartSummary from "./CartSummary";
import { useCartStore } from "@/store/cart";
import { trackEvent, EVENTS } from "@/lib/analytics";
import { useHydrated } from "@/lib/use-hydrated";

export default function CartPageClient() {
  const items = useCartStore((s) => s.items);
  const hydrated = useHydrated();

  useEffect(() => {
    trackEvent(EVENTS.cart_view, { source: "page" });
  }, []);

  if (!hydrated) {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-neutral-100"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-neutral-100" />
      </div>
    );
  }

  if (items.length === 0) {
    return <CartEmptyState />;
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <CartItemRow
            key={`${item.productId}-${item.variantId ?? "default"}`}
            item={item}
          />
        ))}
      </div>
      <div className="lg:sticky lg:top-24 lg:self-start">
        <CartSummary />
      </div>
    </div>
  );
}
