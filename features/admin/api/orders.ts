import "server-only";

import type { OrderStatus } from "@/types/database";
import type { AdminOrderFilters } from "@/features/admin/types";

/**
 * После миграции 006 таблица `orders` удалена. Этот модуль превращён
 * в заглушку, чтобы старые импорты не ломали сборку до завершения
 * этапа 3 (зачистка admin UI).
 *
 * Все функции возвращают пустые данные / no-op. UI заказов будет
 * удалён в этапах 3-4.
 */

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: [],
  confirmed: [],
  in_production: [],
  ready: [],
  shipped: [],
  delivered: [],
  completed: [],
  cancelled: [],
  returned: [],
};

export async function getAdminOrders(
  _filters: AdminOrderFilters,
): Promise<{ data: never[]; total: number }> {
  return { data: [], total: 0 };
}

export async function getOrderById(_id: number): Promise<null> {
  return null;
}

export async function updateOrderStatus(
  _orderId: number,
  _newStatus: OrderStatus,
  _comment: string | null,
  _changedBy: string,
): Promise<void> {
  throw new Error("Заказы упразднены — см. /admin/leads");
}

export async function assignOrder(
  _orderId: number,
  _profileId: string,
): Promise<void> {
  throw new Error("Заказы упразднены — см. /admin/leads");
}

export async function addManagerComment(
  _orderId: number,
  _comment: string,
): Promise<void> {
  throw new Error("Заказы упразднены — см. /admin/leads");
}

export async function getNewOrdersCount(): Promise<number> {
  return 0;
}

export async function exportOrdersCSV(
  _filters: AdminOrderFilters,
): Promise<string> {
  return "";
}
