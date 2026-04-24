"use server";

import type { AdminOrderFilters } from "@/features/admin/types";

/**
 * Заглушки. Заказы упразднены миграцией 006. UI удалит frontend-developer
 * в этапе 3 — пока возвращаем пустые/no-op значения.
 */

export async function fetchOrdersAction(_filters: AdminOrderFilters) {
  return { data: [] as never[], total: 0 };
}

export async function updateOrderStatusAction(
  _orderId: number,
  _data: unknown,
) {
  throw new Error("Заказы упразднены");
}

export async function assignOrderAction(_orderId: number, _data: unknown) {
  throw new Error("Заказы упразднены");
}

export async function addCommentAction(_orderId: number, _data: unknown) {
  throw new Error("Заказы упразднены");
}

export async function exportOrdersAction(
  _filters: AdminOrderFilters,
): Promise<string> {
  return "";
}
