import { notFound } from "next/navigation";
import { getOrderById } from "@/features/admin/api/orders";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import OrderDetailClient from "@/features/admin/components/OrderDetailClient";

export const metadata = { title: "Заказ" };

async function getManagers() {
  if (!isSupabaseConfigured()) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("role", ["owner", "manager"])
    .order("full_name", { ascending: true });
  return data ?? [];
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
