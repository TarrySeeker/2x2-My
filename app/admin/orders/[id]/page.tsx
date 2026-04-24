import { redirect } from "next/navigation";

/**
 * Детальная страница заказа удалена вместе с таблицей `orders`
 * (миграция 006). Редирект на список заявок.
 */
export const metadata = { title: "Заказ → Заявки" };

export default function OrderDetailPage() {
  redirect("/admin/leads");
}
