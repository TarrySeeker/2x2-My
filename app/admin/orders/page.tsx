import { redirect } from "next/navigation";

/**
 * Раздел «Заказы» удалён вместе с таблицей `orders` (миграция 006).
 * Заявки клиентов теперь — `/admin/leads` (calculation_requests + leads).
 *
 * Редирект, чтобы старые ссылки/закладки не вели в 404.
 */
export const metadata = { title: "Заказы → Заявки" };

export default function OrdersPage() {
  redirect("/admin/leads");
}
