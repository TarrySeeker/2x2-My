"use client";

import { useUIStore } from "@/store/ui";
import { formatPriceLabel } from "@/lib/format";
import type { ProductWithRelations } from "@/types";

type StickyMobileBarProps = {
  product: ProductWithRelations;
};

export default function StickyMobileBar({ product }: StickyMobileBarProps) {
  const openOneClick = useUIStore((s) => s.openOneClick);
  const openQuote = useUIStore((s) => s.openQuote);

  const handlePrimary = () => {
    if (product.pricing_mode === "quote") {
      openQuote({
        id: product.id,
        name: product.name,
        slug: product.slug,
        categoryId: product.category_id ?? undefined,
      });
      return;
    }

    if (product.pricing_mode === "fixed") {
      openOneClick({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        imageUrl: product.images[0]?.url ?? null,
      });
      return;
    }

    // calculator — скроллим к калькулятору, там есть точный total и своя кнопка "В корзину"
    const el = typeof document !== "undefined" ? document.getElementById("calculator") : null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const primaryLabel =
    product.pricing_mode === "quote"
      ? "Заказать расчёт"
      : product.pricing_mode === "calculator"
        ? "Рассчитать стоимость"
        : "Купить в 1 клик";

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-neutral-200 bg-white/95 p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md lg:hidden">
      <div className="flex flex-col leading-tight">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
          {product.pricing_mode === "quote" ? "Стартовая цена" : "Цена"}
        </span>
        <span className="font-display text-lg font-bold text-brand-orange tabular-nums">
          {formatPriceLabel({
            price: product.price,
            priceFrom: product.price_from,
            unit: product.unit,
          })}
        </span>
      </div>
      <button
        type="button"
        onClick={handlePrimary}
        className={`ml-auto inline-flex h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold shadow-lg transition-all ${
          product.pricing_mode === "calculator"
            ? "border-2 border-brand-orange bg-white text-brand-orange hover:bg-orange-50"
            : "bg-brand-orange text-white hover:bg-orange-600"
        }`}
      >
        {primaryLabel}
      </button>
    </div>
  );
}
