import "server-only";

import { sql } from "@/lib/db/client";
import type { DashboardStats } from "@/types";
import type { Row } from "@/lib/db/table-types";

type ProductRow = Row<"products">;
type ReviewRow = Row<"reviews">;

/**
 * Дашборд после миграции 006 + cleanup 2026-04-25.
 *
 * Бизнес-модель «только индивидуальный расчёт» — таблиц `orders` /
 * `order_items` нет, выручки/среднего чека нет. Дашборд показывает
 * счётчики заявок (calculation_requests, leads, contact_requests) +
 * вспомогательные срезы для менеджера (источники лидов, заявки с
 * промокодом-маркером).
 *
 * Legacy-функции `getDashboardStats()`, `getRevenueChart()`,
 * `getLatestOrders()`, `getTopProducts()` удалены вместе с виджетами
 * «Выручка», «Средний чек», «Последние заказы», «Топ товаров»
 * (см. handoff admin-dashboard-cleanup-2026-04-25).
 */

/**
 * Основной снапшот для дашборда — RPC `get_dashboard_stats()`.
 * Возвращает типизированный объект; при ошибке БД отдаёт «нулевой»
 * снапшот, чтобы UI не падал.
 */
export async function getDashboardStatsV2(): Promise<DashboardStats> {
  try {
    const rows = await sql<{ get_dashboard_stats: DashboardStats | null }[]>`
      SELECT get_dashboard_stats()
    `;
    return rows[0]?.get_dashboard_stats ?? emptyStatsV2();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getDashboardStatsV2] RPC failed:", err);
    }
    return emptyStatsV2();
  }
}

function emptyStatsV2(): DashboardStats {
  return {
    new_calc_requests: 0,
    calc_requests_week: 0,
    calc_requests_month: 0,
    new_leads: 0,
    leads_week: 0,
    new_contacts: 0,
    pending_reviews: 0,
    products_active: 0,
    products_draft: 0,
    portfolio_count: 0,
    recent_calc_requests: [],
    recent_leads: [],
  };
}

export interface LeadSourceRow {
  source: string;
  count: number;
}

/**
 * Топ-источников лидов за последние 30 дней.
 * Источник — объединение `leads.source` + `leads.utm_source`
 * (utm имеет приоритет, если он задан).
 */
export async function getLeadsBySource30d(
  limit = 5,
): Promise<LeadSourceRow[]> {
  try {
    const rows = await sql<LeadSourceRow[]>`
      SELECT
        COALESCE(NULLIF(utm_source, ''), source, 'direct') AS source,
        COUNT(*)::int AS count
      FROM leads
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY 1
      ORDER BY count DESC
      LIMIT ${limit}
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getLeadsBySource30d] DB request failed:", err);
    }
    return [];
  }
}

/**
 * Кол-во заявок за месяц с заполненным promo_code (любой из трёх
 * таблиц-форм). Помогает менеджеру оценить эффективность акций.
 */
export async function getLeadsWithPromoMonth(): Promise<number> {
  try {
    const rows = await sql<{ count: number }[]>`
      SELECT (
        (SELECT COUNT(*) FROM calculation_requests
          WHERE created_at >= date_trunc('month', CURRENT_DATE)
            AND promo_code IS NOT NULL AND promo_code <> '') +
        (SELECT COUNT(*) FROM leads
          WHERE created_at >= date_trunc('month', CURRENT_DATE)
            AND promo_code IS NOT NULL AND promo_code <> '') +
        (SELECT COUNT(*) FROM contact_requests
          WHERE created_at >= date_trunc('month', CURRENT_DATE)
            AND promo_code IS NOT NULL AND promo_code <> '')
      )::int AS count
    `;
    return rows[0]?.count ?? 0;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getLeadsWithPromoMonth] DB request failed:", err);
    }
    return 0;
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
