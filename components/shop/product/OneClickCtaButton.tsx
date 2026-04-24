"use client";

import { Calculator } from "lucide-react";
import { useUIStore } from "@/store/ui";

type OneClickCtaButtonProps = {
  productId: number;
  productName: string;
  productSlug: string;
  productImageUrl: string | null;
};

/**
 * После Chain 4a фиксированных цен в каталоге больше нет — все позиции
 * требуют согласования с менеджером. Эта CTA открывает мини-форму
 * «Быстрый расчёт»: ФИО + телефон + комментарий, отправляет single-item
 * заявку через `/api/orders` (payment.method='bank_transfer',
 * delivery.type='pickup').
 */
export default function OneClickCtaButton({
  productId,
  productName,
  productSlug,
  productImageUrl,
}: OneClickCtaButtonProps) {
  const openOneClick = useUIStore((s) => s.openOneClick);

  return (
    <button
      type="button"
      onClick={() =>
        openOneClick({
          id: productId,
          name: productName,
          slug: productSlug,
          imageUrl: productImageUrl,
        })
      }
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-orange/20 transition-all hover:bg-orange-600 hover:shadow-xl hover:shadow-brand-orange/30"
    >
      <Calculator className="h-5 w-5" />
      Быстрый расчёт
    </button>
  );
}
