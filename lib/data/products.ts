import "server-only";

import { sql } from "@/lib/db/client";
import type { Product, ProductFilters } from "@/types";

/**
 * Заглушка getProducts — фильтры пока не применяются (товары
 * упразднены 2026-04-26, остались только сервисы). Если в будущем
 * вернутся товары — взять реализацию из git history.
 */
export async function getProducts(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _filters: ProductFilters = {},
): Promise<Product[]> {
  try {
    const rows = await sql<Product[]>`
      SELECT *
      FROM products
      WHERE status = 'active'
      ORDER BY sort_order ASC
      LIMIT 24
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getProducts] DB request failed, returning empty:", err);
    }
    return [];
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const rows = await sql<Product[]>`
      SELECT *
      FROM products
      WHERE slug = ${slug}
        AND status = 'active'
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getProductBySlug] DB request failed:", err);
    }
    return null;
  }
}
