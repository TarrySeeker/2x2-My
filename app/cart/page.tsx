import type { Metadata } from "next";
import CartPageClient from "@/components/shop/cart/CartPageClient";

export const metadata: Metadata = {
  title: "Корзина",
  description: "Ваша корзина — рекламная компания 2×2, Ханты-Мансийск",
};

export default function CartPage() {
  return (
    <main className="container py-8 md:py-12">
      <h1 className="mb-8 font-display text-3xl font-bold text-brand-dark md:text-4xl">
        Корзина
      </h1>
      <CartPageClient />
    </main>
  );
}
