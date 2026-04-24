import "server-only";

/**
 * Заглушка после удаления таблицы `orders` (миграция 006).
 *
 * Создание накладных СДЭК для заказов больше не нужно — заказы
 * отключены, оставлены заявки. Если в будущем потребуется создавать
 * отправления, например для отправки полиграфии клиенту по СДЭК —
 * восстановить из git history.
 */

export interface ShipmentResult {
  success: boolean;
  cdek_order_uuid?: string;
  cdek_order_number?: string;
  error?: string;
}

export async function createCdekShipment(
  _orderId: number,
): Promise<ShipmentResult> {
  return {
    success: false,
    error: "Заказы упразднены — функция СДЭК-отправлений отключена",
  };
}
