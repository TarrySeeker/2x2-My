import { getNewOrdersCount } from "@/features/admin/api/orders";
import { fetchOrdersAction } from "@/features/admin/actions/orders";
import OrdersPageClient from "@/features/admin/components/OrdersPageClient";

export const metadata = { title: "Заказы" };

export default async function OrdersPage() {
  const newCount = await getNewOrdersCount();

  return (
    <OrdersPageClient
      newOrdersCount={newCount}
      fetchOrders={fetchOrdersAction}
    />
  );
}
