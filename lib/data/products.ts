import "server-only";

import { sql } from "@/lib/db/client";
import type { Product, ProductFilters } from "@/types";

/**
 * Заглушка getProducts — Этап 1 не требует реальных товаров.
 * Реализация с фильтрами и пагинацией придёт в Этапе 2 (каталог).
 */
export async function getProducts(
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
