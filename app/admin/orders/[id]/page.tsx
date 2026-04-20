import { notFound } from "next/navigation";
import { getOrderById } from "@/features/admin/api/orders";
import { sql } from "@/lib/db/client";
import OrderDetailClient from "@/features/admin/components/OrderDetailClient";

export const metadata = { title: "Заказ" };

async function getManagers() {
  try {
    const rows = await sql<
      { id: string; full_name: string | null; email: string | null }[]
    >`
      SELECT id, full_name, email
      FROM users
      WHERE role IN ('owner', 'manager')
      ORDER BY full_name NULLS LAST ASC
    `;
    return rows;
  } catch (err) {
    console.warn("[admin/orders/page] getManagers failed:", err);
    return [];
  }
}

export default async function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const orderId = Number(id);
  if (Number.isNaN(orderId)) notFound();

  const [order, managers] = await Promise.all([
    getOrderById(orderId),
    getManagers(),
  ]);

  if (!order) notFound();

  return <OrderDetailClient order={order} managers={managers} />;
}
