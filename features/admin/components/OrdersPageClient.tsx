"use client";

import * as React from "react";

/**
 * Заглушка после удаления таблицы `orders` (миграция 006). Раздел
 * заменён редиректом в /admin/leads. Сам компонент сохранён, чтобы
 * не сломать импорты тестов; будет удалён в этапе 3.
 */
export default function OrdersPageClient(): React.ReactElement {
  return (
    <div className="p-6 text-sm text-neutral-500">
      Раздел «Заказы» упразднён. Используйте «Заявки».
    </div>
  );
}
