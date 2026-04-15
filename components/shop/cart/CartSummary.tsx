"use client";

import Button from "@/components/ui/Button";
import PromoCodeInput from "./PromoCodeInput";
import { useCartStore } from "@/store/cart";
import { formatRub } from "@/lib/format";
import { trackEvent, EVENTS } from "@/lib/analytics";

export default function CartSummary() {
  const items = useCartStore((s) => s.items);
  const promoDiscount = useCartStore((s) => s.promoDiscount);
  const clearCart = useCartStore((s) => s.clearCart);
  const getSubtotal = useCartStore((s) => s.getSubtotal);
  const getTotal = useCartStore((s) => s.getTotal);
  const getItemsCount = useCartStore((s) => s.getItemsCount);

  const subtotal = getSubtotal();
  const total = getTotal();
  const count = getItemsCount();
  const isEmpty = items.length === 0;

  const handleClear = () => {
    if (window.confirm("Очистить корзину? Все товары будут удалены.")) {
      trackEvent(EVENTS.cart_clear, { items_count: count });
      clearCart();
    }
  };

  const handleCheckout = () => {
    trackEvent(EVENTS.checkout_start, {
      items_count: count,
      subtotal,
      total,
    });
  };

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h3 className="font-display text-lg font-bold text-brand-dark">Итого</h3>

      <div className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">Подитог</span>
          <span className="font-semibold tabular-nums text-brand-dark">
            {formatRub(subtotal)} ₽
          </span>
        </div>
        {promoDiscount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Скидка по промокоду</span>
            <span className="font-semibold tabular-nums">
              −{formatRub(promoDiscount)} ₽
            </span>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-neutral-100 pt-3">
          <span className="font-display text-base font-bold text-brand-dark">
            Итого к оплате
          </span>
          <span className="font-display text-xl font-bold tabular-nums text-brand-orange">
            {formatRub(total)} ₽
          </span>
        </div>
      </div>

      <PromoCodeInput />

      <div className="flex flex-col gap-2">
        <Button
          href={isEmpty ? undefined : "/checkout"}
          onClick={isEmpty ? undefined : handleCheckout}
          disabled={isEmpty}
        >
          Оформить заказ
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={isEmpty}
        >
          Очистить корзину
        </Button>
      </div>
    </div>
  );
}
