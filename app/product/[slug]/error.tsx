"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[product] route error", error);
  }, [error]);

  return (
    <main className="bg-surface-cream">
      <div className="mx-auto flex min-h-[60vh] w-full max-w-[720px] flex-col items-center justify-center gap-5 px-4 py-16 text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-500">
          <AlertTriangle className="h-8 w-8" />
        </span>
        <h1 className="font-display text-3xl font-bold text-brand-dark">
          Не удалось загрузить услугу
        </h1>
        <p className="max-w-md text-sm text-neutral-600">
          Попробуйте обновить страницу. Если это повторится — посмотрите другие
          услуги в каталоге или свяжитесь с менеджером напрямую.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={() => reset()}>Обновить</Button>
          <Link
            href="/catalog"
            className="inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white px-6 py-3 text-sm font-semibold text-brand-dark transition-colors hover:border-brand-orange hover:text-brand-orange"
          >
            В каталог
          </Link>
        </div>
      </div>
    </main>
  );
}
