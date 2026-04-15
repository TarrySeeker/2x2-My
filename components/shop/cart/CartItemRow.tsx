"use client";

import Image from "next/image";
import { Trash2 } from "lucide-react";
import clsx from "clsx";
import QuantityStepper from "@/components/ui/QuantityStepper";
import { useCartStore, type CartItemData } from "@/store/cart";
import { formatRub } from "@/lib/format";
import { trackEvent, EVENTS } from "@/lib/analytics";

type CartItemRowProps = {
  item: CartItemData;
  compact?: boolean;
};

export default function CartItemRow({ item, compact }: CartItemRowProps) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const handleRemove = () => {
    removeItem(item.productId, item.variantId);
    trackEvent(EVENTS.cart_item_remove, {
      productId: item.productId,
      name: item.name,
      source: compact ? "drawer" : "page",
    });
  };

  const lineTotal = item.price * item.quantity;

  return (
    <div
      className={clsx(
        "flex items-start gap-3 rounded-xl",
        compact
          ? "p-3 bg-neutral-50"
          : "p-4 border border-neutral-100 bg-white shadow-xs",
      )}
    >
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-100">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-neutral-300">
            Фото
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h4 className="truncate text-sm font-semibold text-brand-dark">
          {item.name}
        </h4>
        <span className="text-xs text-neutral-500">
          {formatRub(item.price)} ₽ за ед.
        </span>

        <div className="mt-1 flex items-center gap-3">
          <QuantityStepper
            value={item.quantity}
            min={1}
            max={item.maxStock}
            onChange={(n) =>
              updateQuantity(item.productId, item.variantId, n)
            }
          />
          <span className="text-sm font-bold tabular-nums text-brand-dark">
            {formatRub(lineTotal)} ₽
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleRemove}
        aria-label={`Удалить ${item.name}`}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
