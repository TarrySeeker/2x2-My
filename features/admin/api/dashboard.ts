import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type {
  DashboardStats,
  ChartDataPoint,
  TopProduct,
} from "@/features/admin/types";
import type { Row } from "@/lib/supabase/table-types";

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
  if (!isSupabaseConfigured()) return demoStats();

  const supabase = createAdminClient();

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStart = startOfDay(yesterday);
  const yesterdayEnd = endOfDay(yesterday);

  const [todayOrders, yesterdayOrders, newOrdersResult] = await Promise.all([
    supabase
      .from("orders")
      .select("total")
      .eq("payment_status", "paid")
      .gte("paid_at", todayStart)
      .lte("paid_at", todayEnd),
    supabase
      .from("orders")
      .select("total")
      .eq("payment_status", "paid")
      .gte("paid_at", yesterdayStart)
      .lte("paid_at", yesterdayEnd),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
  ]);

  const todayData = todayOrders.data ?? [];
  const yesterdayData = yesterdayOrders.data ?? [];

  const todayRevenue = todayData.reduce((sum, o) => sum + (o.total ?? 0), 0);
  const yesterdayRevenue = yesterdayData.reduce(
    (sum, o) => sum + (o.total ?? 0),
    0,
  );

  const todayAvg = todayData.length > 0 ? todayRevenue / todayData.length : 0;
  const yesterdayAvg =
    yesterdayData.length > 0 ? yesterdayRevenue / yesterdayData.length : 0;

  return {
    revenue: { today: todayRevenue, yesterday: yesterdayRevenue },
    orders: { today: todayData.length, yesterday: yesterdayData.length },
    avgCheck: {
      today: Math.round(todayAvg),
      yesterday: Math.round(yesterdayAvg),
    },
    newOrders: newOrdersResult.count ?? 0,
  };
}

export async function getRevenueChart(
  days: 7 | 30,
): Promise<ChartDataPoint[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from("orders")
    .select("total, paid_at")
    .eq("payment_status", "paid")
    .gte("paid_at", startOfDay(since))
    .order("paid_at", { ascending: true });

  if (!data || data.length === 0) return [];

  const grouped = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    grouped.set(d.toISOString().slice(0, 10), 0);
  }

  for (const row of data) {
    if (!row.paid_at) continue;
    const key = row.paid_at.slice(0, 10);
    grouped.set(key, (grouped.get(key) ?? 0) + (row.total ?? 0));
  }

  return Array.from(grouped, ([date, revenue]) => ({ date, revenue }));
}

export async function getLatestOrders(
  limit = 5,
): Promise<OrderRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getTopProducts(
  limit = 5,
): Promise<TopProduct[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();

  // Supabase doesn't support aggregate queries via the client API,
  // so we fetch recent order_items and aggregate in JS.
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, name, price, quantity, image_url")
    .not("product_id", "is", null)
    .limit(500);

  if (!items || items.length === 0) return [];

  const map = new Map<
    number,
    { name: string; image_url: string | null; sold: number; revenue: number }
  >();

  for (const item of items) {
    if (item.product_id === null) continue;
    const existing = map.get(item.product_id);
    if (existing) {
      existing.sold += item.quantity;
      existing.revenue += item.price * item.quantity;
    } else {
      map.set(item.product_id, {
        name: item.name,
        image_url: item.image_url,
        sold: item.quantity,
        revenue: item.price * item.quantity,
      });
    }
  }

  return Array.from(map, ([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function getLowStockProducts(): Promise<ProductRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .eq("track_stock", true)
    .lt("stock", 5)
    .order("stock", { ascending: true })
    .limit(10);

  return data ?? [];
}

export async function getPendingReviews(
  limit = 5,
): Promise<ReviewRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
