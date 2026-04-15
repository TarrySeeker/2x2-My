"use client";

import { Loader2 } from "lucide-react";
import { formatRub } from "@/lib/format";
import type { CartItemData } from "@/store/cart";

type Props = {
  items: CartItemData[];
  subtotal: number;
  total: number;
  promoDiscount: number;
  isSubmitting: boolean;
};

export default function OrderSummary({
  items,
  subtotal,
  total,
  promoDiscount,
  isSubmitting,
}: Props) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h3 className="font-display text-lg font-bold text-brand-dark">
        Ваш заказ
      </h3>

      <ul className="flex flex-col gap-2 text-sm">
        {items.map((item) => (
          <li
            key={`${item.productId}-${item.variantId ?? "d"}`}
            className="flex items-start justify-between gap-2"
          >
            <span className="text-neutral-600 line-clamp-2">
              {item.name}{" "}
              <span className="text-neutral-400">× {item.quantity}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-brand-dark">
              {formatRub(item.price * item.quantity)} ₽
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-neutral-100 pt-4 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-500">Подитог</span>
          <span className="font-semibold tabular-nums text-brand-dark">
            {formatRub(subtotal)} ₽
          </span>
        </div>

        {promoDiscount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Скидка</span>
            <span className="font-semibold tabular-nums">
              −{formatRub(promoDiscount)} ₽
            </span>
          </div>
        )}

        <div className="mt-2 flex justify-between border-t border-neutral-100 pt-3">
          <span className="font-display text-base font-bold text-brand-dark">
            Итого
          </span>
          <span className="font-display text-xl font-bold tabular-nums text-brand-orange">
            {formatRub(total)} ₽
          </span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-6 py-3.5 font-semibold text-white transition-all hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Оформляем…
          </>
        ) : (
          "Подтвердить заказ"
        )}
      </button>

      <p className="text-center text-xs text-neutral-500">
        Нажимая «Подтвердить заказ», вы соглашаетесь с{" "}
        <a href="/privacy" className="text-brand-orange hover:underline">
          политикой обработки данных
        </a>
      </p>
    </div>
  );
}
