"use client";

import { useEffect, useRef } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import CartEmptyState from "./CartEmptyState";
import CartItemRow from "./CartItemRow";
import { useCartStore } from "@/store/cart";
import { formatRub } from "@/lib/format";
import { trackEvent, EVENTS } from "@/lib/analytics";

export default function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const setOpen = useCartStore((s) => s.setOpen);
  const items = useCartStore((s) => s.items);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getItemsCount = useCartStore((s) => s.getItemsCount);

  const count = getItemsCount();
  const subtotal = getSubtotal();
  const prevOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpen.current) {
      trackEvent(EVENTS.cart_view, { source: "drawer" });
    }
    prevOpen.current = isOpen;
  }, [isOpen]);

  const handleClose = () => setOpen(false);

  return (
    <Sheet
      open={isOpen}
      onClose={handleClose}
      side="right"
      title={`Корзина${count > 0 ? ` (${count})` : ""}`}
      footer={
        items.length > 0 ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Итого</span>
              <span className="font-display text-lg font-bold tabular-nums text-brand-orange">
                {formatRub(subtotal)} ₽
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="flex-1"
              >
                Продолжить покупки
              </Button>
              <Button
                href="/cart"
                size="sm"
                onClick={handleClose}
                className="flex-1"
              >
                Перейти в корзину
              </Button>
            </div>
          </div>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <CartEmptyState />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <CartItemRow
              key={`${item.productId}-${item.variantId ?? "default"}`}
              item={item}
              compact
            />
          ))}
        </div>
      )}
    </Sheet>
  );
}
