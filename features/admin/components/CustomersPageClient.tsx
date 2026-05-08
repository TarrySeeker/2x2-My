"use client";

import * as React from "react";

/**
 * Раздел «Клиенты» строился из таблицы `orders` (агрегация). После
 * миграции 006 orders удалена. Новый раздел с агрегацией из leads/
 * calculation_requests появится в этапе 3 — пока заглушка.
 */
export default function CustomersPageClient(): React.ReactElement {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-brand-dark dark:text-white">
        Клиенты
      </h1>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-400">
        Раздел временно недоступен — переезжаем на новую модель данных
        (заявки вместо заказов). Список клиентов будет восстановлен
        в ближайшем релизе.
      </div>
    </div>
  );
}
