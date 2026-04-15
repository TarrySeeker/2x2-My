"use client";

import { Calculator } from "lucide-react";
import { useUIStore } from "@/store/ui";

type QuoteCtaButtonProps = {
  productId: number;
  productName: string;
  productSlug: string;
  categoryId?: number | null;
};

export default function QuoteCtaButton({
  productId,
  productName,
  productSlug,
  categoryId,
}: QuoteCtaButtonProps) {
  const openQuote = useUIStore((s) => s.openQuote);

  return (
    <button
      type="button"
      onClick={() =>
        openQuote({
          id: productId,
          name: productName,
          slug: productSlug,
          categoryId,
        })
      }
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-orange/20 transition-all hover:bg-orange-600 hover:shadow-xl hover:shadow-brand-orange/30"
    >
      <Calculator className="h-5 w-5" />
      Заказать расчёт
    </button>
  );
}
