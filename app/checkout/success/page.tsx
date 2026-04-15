import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle, ArrowLeft } from "lucide-react";
import SuccessPhoneLink from "@/components/shop/checkout/SuccessPhoneLink";

export const metadata: Metadata = {
  title: "Заказ принят",
  description: "Ваш заказ успешно оформлен — рекламная компания 2×2",
};

type Props = {
  searchParams: Promise<{ order?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const orderNumber = params.order;

  return (
    <main className="container flex flex-col items-center py-16 text-center md:py-24">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
        <CheckCircle className="h-10 w-10 text-green-500" strokeWidth={1.5} />
      </div>

      <h1 className="mt-6 font-display text-3xl font-bold text-brand-dark md:text-4xl">
        {orderNumber ? (
          <>Заказ #{orderNumber} принят</>
        ) : (
          <>Спасибо за заказ!</>
        )}
      </h1>

      <p className="mt-4 max-w-md text-neutral-500">
        Менеджер «2х2» свяжется с вами в течение 15 минут в рабочее время
        (Пн–Пт 09:00–19:00).
      </p>

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-6 py-3 font-semibold text-white transition-colors hover:bg-orange-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться в каталог
        </Link>

        <SuccessPhoneLink />
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        Если возникли вопросы — позвоните или напишите нам
      </p>
    </main>
  );
}
