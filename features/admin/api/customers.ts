import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { CustomerFilters, CustomerSummary, OrderRow } from "@/features/admin/types";

// ── List customers (aggregated from orders) ──
// TODO: Move to RPC function when data volume grows for better performance

export async function getCustomers(
  filters: CustomerFilters,
): Promise<{ data: CustomerSummary[]; total: number }> {
  if (!isSupabaseConfigured()) return { data: [], total: 0 };

  const supabase = createAdminClient();

  // Fetch all orders and aggregate in JS
  // This approach works for low-to-medium order volumes
  const query = supabase
    .from("orders")
    .select("customer_name, customer_phone, customer_email, total, created_at")
    .order("created_at", { ascending: false });

  const { data: orders } = await query;

  if (!orders || orders.length === 0) return { data: [], total: 0 };

  // Aggregate by phone
  const customerMap = new Map<string, CustomerSummary>();

  for (const order of orders) {
    const phone = order.customer_phone;
    const existing = customerMap.get(phone);

    if (existing) {
      existing.orders_count += 1;
      existing.total_spent += order.total;
      // Keep the most recent name/email
      if (!existing.customer_email && order.customer_email) {
        existing.customer_email = order.customer_email;
      }
    } else {
      customerMap.set(phone, {
        customer_name: order.customer_name,
        customer_phone: phone,
        customer_email: order.customer_email,
        orders_count: 1,
        total_spent: order.total,
        last_order_date: order.created_at,
      });
    }
  }

  let customers = Array.from(customerMap.values());

  // Apply search filter
  if (filters.search) {
    const s = filters.search.toLowerCase();
    customers = customers.filter(
      (c) =>
        c.customer_name.toLowerCase().includes(s) ||
        c.customer_phone.includes(s) ||
        (c.customer_email && c.customer_email.toLowerCase().includes(s)),
    );
  }

  // Sort by last order date (most recent first)
  customers.sort(
    (a, b) =>
      new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime(),
  );

  const total = customers.length;

  // Paginate
  const start = (filters.page - 1) * filters.perPage;
  const paginated = customers.slice(start, start + filters.perPage);

  return { data: paginated, total };
}

// ── Get all orders for a customer ──

export async function getCustomerOrders(phone: string): Promise<OrderRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: false });

  return data ?? [];
}
