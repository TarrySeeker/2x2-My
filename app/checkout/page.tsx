import type { Metadata } from "next";
import CheckoutPageClient from "@/components/shop/checkout/CheckoutPageClient";

export const metadata: Metadata = {
  title: "Оформление заказа",
  description: "Оформите заказ быстро и удобно — рекламная компания 2×2, Ханты-Мансийск",
};

export default function CheckoutPage() {
  return (
    <main className="container py-8 md:py-12">
      <h1 className="mb-8 font-display text-3xl font-bold text-brand-dark md:text-4xl">
        Оформление заказа
      </h1>
      <CheckoutPageClient />
    </main>
  );
}
