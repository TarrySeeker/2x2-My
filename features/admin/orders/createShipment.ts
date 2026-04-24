"use server";

/**
 * Заглушка после удаления таблицы `orders` (миграция 006). Функция
 * оставлена, чтобы старые импорты не ломали сборку. UI кнопки
 * «создать накладную СДЭК» удалит frontend-developer в этапе 3.
 */

export type CreateShipmentResult =
  | { ok: true; trackNumber: string }
  | { ok: false; error: string };

export async function createShipmentAction(
  _orderId: string | number,
): Promise<CreateShipmentResult> {
  return {
    ok: false,
    error: "Заказы упразднены. См. /admin/leads",
  };
}
