"use server";

/**
 * Заглушка после удаления таблицы `orders` (миграция 006).
 */

export type UpdateRequisitesResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateRequisitesAction(
  _orderId: number,
  _data: unknown,
): Promise<UpdateRequisitesResult> {
  return { ok: false, error: "Заказы упразднены. См. /admin/leads" };
}
