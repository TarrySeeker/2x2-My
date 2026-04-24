import "server-only";

import { sql } from "@/lib/db/client";
import type {
  DashboardStats,
  ChartDataPoint,
  TopProduct,
} from "@/features/admin/types";
import type { Row } from "@/lib/db/table-types";

type ProductRow = Row<"products">;
type ReviewRow = Row<"reviews">;

/**
 * Дашборд после миграции 006.
 *
 * Таблицы `orders` и `order_items` удалены (бизнес-модель «только
 * индивидуальный расчёт»). Дашборд теперь показывает счётчики заявок
 * (calculation_requests, leads, contact_requests). Старые поля
 * revenue/orders оставлены NULL/0 для совместимости со старым UI —
 * frontend-developer заменит UI в этапе 3.
 */

function emptyStats(): DashboardStats {
  return {
    revenue: { today: 0, yesterday: 0 },
    orders: { today: 0, yesterday: 0 },
    avgCheck: { today: 0, yesterday: 0 },
    newOrders: 0,
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // orders больше нет — возвращаем нули для legacy UI.
  // Реальные счётчики читаем через get_dashboard_stats() RPC по
  // мере перехода на новый дашборд.
  try {
    // Просто проверим, что БД жива.
    await sql`SELECT 1`;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getDashboardStats] DB ping failed:", err);
    }
  }
  return emptyStats();
}

export async function getRevenueChart(
  _days: 7 | 30,
): Promise<ChartDataPoint[]> {
  return [];
}

export async function getLatestOrders(_limit = 5): Promise<never[]> {
  return [];
}

export async function getTopProducts(_limit = 5): Promise<TopProduct[]> {
  return [];
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

/**
 * Новый dashboard (CMS-эра): читает get_dashboard_stats() RPC.
 * Возвращает JSONB как есть. Использовать в новом UI.
 */
export async function getDashboardStatsV2(): Promise<unknown> {
  try {
    const rows = await sql<{ get_dashboard_stats: unknown }[]>`
      SELECT get_dashboard_stats()
    `;
    return rows[0]?.get_dashboard_stats ?? null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getDashboardStatsV2] RPC failed:", err);
    }
    return null;
  }
}
