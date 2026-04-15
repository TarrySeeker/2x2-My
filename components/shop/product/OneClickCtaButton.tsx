"use client";

import { ShoppingCart } from "lucide-react";
import { useUIStore } from "@/store/ui";

type OneClickCtaButtonProps = {
  productId: number;
  productName: string;
  productSlug: string;
  productPrice: number;
  productImageUrl: string | null;
};

export default function OneClickCtaButton({
  productId,
  productName,
  productSlug,
  productPrice,
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
          price: productPrice,
          imageUrl: productImageUrl,
        })
      }
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand-orange/20 transition-all hover:bg-orange-600 hover:shadow-xl hover:shadow-brand-orange/30"
    >
      <ShoppingCart className="h-5 w-5" />
      Купить в 1 клик
    </button>
  );
}
