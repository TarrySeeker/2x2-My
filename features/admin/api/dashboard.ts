import "server-only";

import { sql } from "@/lib/db/client";
import type {
  DashboardStats,
  ChartDataPoint,
  TopProduct,
} from "@/features/admin/types";
import type { Row } from "@/lib/db/table-types";

type OrderRow = Row<"orders">;
type ProductRow = Row<"products">;
type ReviewRow = Row<"reviews">;

// ── Helpers ──

function startOfDay(date: Date): string {
  return date.toISOString().slice(0, 10) + "T00:00:00.000Z";
}

function endOfDay(date: Date): string {
  return date.toISOString().slice(0, 10) + "T23:59:59.999Z";
}

function demoStats(): DashboardStats {
  return {
    revenue: { today: 0, yesterday: 0 },
    orders: { today: 0, yesterday: 0 },
    avgCheck: { today: 0, yesterday: 0 },
    newOrders: 0,
  };
}

// ── Public API ──

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStart = startOfDay(yesterday);
    const yesterdayEnd = endOfDay(yesterday);

    const [todayOrders, yesterdayOrders, newOrdersResult] = await Promise.all([
      sql<{ total: number }[]>`
        SELECT total
        FROM orders
        WHERE payment_status = 'paid'
          AND paid_at >= ${todayStart}
          AND paid_at <= ${todayEnd}
      `,
      sql<{ total: number }[]>`
        SELECT total
        FROM orders
        WHERE payment_status = 'paid'
          AND paid_at >= ${yesterdayStart}
          AND paid_at <= ${yesterdayEnd}
      `,
      sql<{ count: number }[]>`
        SELECT COUNT(*)::int AS count
        FROM orders
        WHERE status = 'new'
      `,
    ]);

    const todayRevenue = todayOrders.reduce(
      (sum: number, o: { total: number }) => sum + (Number(o.total) ?? 0),
      0,
    );
    const yesterdayRevenue = yesterdayOrders.reduce(
      (sum: number, o: { total: number }) => sum + (Number(o.total) ?? 0),
      0,
    );

    const todayAvg =
      todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
    const yesterdayAvg =
      yesterdayOrders.length > 0
        ? yesterdayRevenue / yesterdayOrders.length
        : 0;

    return {
      revenue: { today: todayRevenue, yesterday: yesterdayRevenue },
      orders: { today: todayOrders.length, yesterday: yesterdayOrders.length },
      avgCheck: {
        today: Math.round(todayAvg),
        yesterday: Math.round(yesterdayAvg),
      },
      newOrders: newOrdersResult[0]?.count ?? 0,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getDashboardStats] DB request failed:", err);
    }
    return demoStats();
  }
}

export async function getRevenueChart(
  days: 7 | 30,
): Promise<ChartDataPoint[]> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const rows = await sql<{ total: number; paid_at: string }[]>`
      SELECT total, paid_at
      FROM orders
      WHERE payment_status = 'paid'
        AND paid_at >= ${startOfDay(since)}
      ORDER BY paid_at ASC
    `;

    if (rows.length === 0) return [];

    const grouped = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      grouped.set(d.toISOString().slice(0, 10), 0);
    }

    for (const row of rows) {
      if (!row.paid_at) continue;
      const key = String(row.paid_at).slice(0, 10);
      grouped.set(key, (grouped.get(key) ?? 0) + (Number(row.total) ?? 0));
    }

    return Array.from(grouped, ([date, revenue]) => ({ date, revenue }));
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getRevenueChart] DB request failed:", err);
    }
    return [];
  }
}

export async function getLatestOrders(limit = 5): Promise<OrderRow[]> {
  try {
    const rows = await sql<OrderRow[]>`
      SELECT *
      FROM orders
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getLatestOrders] DB request failed:", err);
    }
    return [];
  }
}

export async function getTopProducts(limit = 5): Promise<TopProduct[]> {
  try {
    // Aggregate in JS (как было в Supabase-версии).
    const items = await sql<
      {
        product_id: number | null;
        name: string;
        price: number;
        quantity: number;
        image_url: string | null;
      }[]
    >`
      SELECT product_id, name, price, quantity, image_url
      FROM order_items
      WHERE product_id IS NOT NULL
      LIMIT 500
    `;

    if (items.length === 0) return [];

    const map = new Map<
      number,
      { name: string; image_url: string | null; sold: number; revenue: number }
    >();

    for (const item of items) {
      if (item.product_id === null) continue;
      const existing = map.get(item.product_id);
      if (existing) {
        existing.sold += item.quantity;
        existing.revenue += Number(item.price) * item.quantity;
      } else {
        map.set(item.product_id, {
          name: item.name,
          image_url: item.image_url,
          sold: item.quantity,
          revenue: Number(item.price) * item.quantity,
        });
      }
    }

    return Array.from(map, ([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getTopProducts] DB request failed:", err);
    }
    return [];
  }
}

export async function getLowStockProducts(): Promise<ProductRow[]> {
  try {
    const rows = await sql<ProductRow[]>`
      SELECT *
      FROM products
      WHERE status = 'active'
        AND track_stock = true
        AND stock < 5
      ORDER BY stock ASC
      LIMIT 10
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getLowStockProducts] DB request failed:", err);
    }
    return [];
  }
}

export async function getPendingReviews(limit = 5): Promise<ReviewRow[]> {
  try {
    const rows = await sql<ReviewRow[]>`
      SELECT *
      FROM reviews
      WHERE status = 'pending'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getPendingReviews] DB request failed:", err);
    }
    return [];
  }
}
