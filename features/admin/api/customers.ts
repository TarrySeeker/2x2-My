import "server-only";

import type {
  CustomerFilters,
  CustomerSummary,
} from "@/features/admin/types";

/**
 * Заглушка после удаления таблицы `orders` (миграция 006).
 *
 * Раздел «Клиенты» строился агрегацией из orders. После перехода на
 * модель «только индивидуальный расчёт» эти данные нужно собирать из
 * leads и calculation_requests — это сделает frontend-developer в
 * этапе 3 (новый /admin/customers либо удаление раздела).
 *
 * Пока возвращаем пусто, UI рендерит «Нет данных».
 */

export async function getCustomers(
  _filters: CustomerFilters,
): Promise<{ data: CustomerSummary[]; total: number }> {
  return { data: [], total: 0 };
}

export async function getCustomerOrders(_phone: string): Promise<never[]> {
  return [];
}
