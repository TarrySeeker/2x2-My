import "server-only";

import { sql } from "@/lib/db/client";
import type {
  CustomerFilters,
  CustomerSummary,
  OrderRow,
} from "@/features/admin/types";

// ── List customers (агрегация из orders в JS) ──
// TODO: перенести в RPC при росте объёма заказов.

export async function getCustomers(
  filters: CustomerFilters,
): Promise<{ data: CustomerSummary[]; total: number }> {
  try {
    const orders = await sql<
      {
        customer_name: string;
        customer_phone: string;
        customer_email: string | null;
        total: number;
        created_at: string;
      }[]
    >`
      SELECT customer_name, customer_phone, customer_email, total, created_at
      FROM orders
      ORDER BY created_at DESC
    `;

    if (orders.length === 0) return { data: [], total: 0 };

    const customerMap = new Map<string, CustomerSummary>();

    for (const order of orders) {
      const phone = order.customer_phone;
      const existing = customerMap.get(phone);

      if (existing) {
        existing.orders_count += 1;
        existing.total_spent += Number(order.total);
        if (!existing.customer_email && order.customer_email) {
          existing.customer_email = order.customer_email;
        }
      } else {
        customerMap.set(phone, {
          customer_name: order.customer_name,
          customer_phone: phone,
          customer_email: order.customer_email,
          orders_count: 1,
          total_spent: Number(order.total),
          last_order_date: order.created_at,
        });
      }
    }

    let customers = Array.from(customerMap.values());

    if (filters.search) {
      const s = filters.search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(s) ||
          c.customer_phone.includes(s) ||
          (c.customer_email && c.customer_email.toLowerCase().includes(s)),
      );
    }

    customers.sort(
      (a, b) =>
        new Date(b.last_order_date).getTime() -
        new Date(a.last_order_date).getTime(),
    );

    const total = customers.length;
    const start = (filters.page - 1) * filters.perPage;
    const paginated = customers.slice(start, start + filters.perPage);

    return { data: paginated, total };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getCustomers] DB request failed:", err);
    }
    return { data: [], total: 0 };
  }
}

export async function getCustomerOrders(phone: string): Promise<OrderRow[]> {
  try {
    const rows = await sql<OrderRow[]>`
      SELECT *
      FROM orders
      WHERE customer_phone = ${phone}
      ORDER BY created_at DESC
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getCustomerOrders] DB request failed:", err);
    }
    return [];
  }
}
