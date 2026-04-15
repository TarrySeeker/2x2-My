"use client";

import { ShoppingCart } from "lucide-react";
import Button from "@/components/ui/Button";

export default function CartEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400">
        <ShoppingCart className="h-10 w-10" />
      </span>
      <h3 className="font-display text-xl font-bold text-brand-dark">
        Корзина пуста
      </h3>
      <p className="mt-2 max-w-xs text-sm text-neutral-500">
        Начните с каталога услуг — найдите то, что нужно
      </p>
      <Button href="/services" className="mt-6">
        Перейти в каталог
      </Button>
    </div>
  );
}
