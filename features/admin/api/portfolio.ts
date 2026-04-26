import "server-only";

import { sql, type Tx } from "@/lib/db/client";
import type { PortfolioItem } from "@/types";
import type {
  PortfolioFormData,
  PortfolioReorderInput,
} from "@/features/admin/schemas/portfolio";

/**
 * Data-layer для CRUD портфолио в админке.
 *
 * Витрина читает портфолио через `lib/data/portfolio.ts` (с кешем
 * по тегу `portfolio:featured`); здесь — низкоуровневые операции
 * для админки. Cache-invalidation выполняется на уровне actions.
 */

/**
 * Полный список (включая снятые с публикации) для администратора.
 * Сортировка: published-первыми, затем по sort_order, затем по id.
 */
export async function getAllPortfolioForAdmin(): Promise<PortfolioItem[]> {
  try {
    return await sql<PortfolioItem[]>`
      SELECT *
      FROM portfolio_items
      ORDER BY is_published DESC, sort_order ASC, id DESC
    `;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getAllPortfolioForAdmin] DB request failed:", err);
    }
    return [];
  }
}

export async function getPortfolioItemById(
  id: number,
): Promise<PortfolioItem | null> {
  const rows = await sql<PortfolioItem[]>`
    SELECT * FROM portfolio_items WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getPortfolioItemBySlug(
  slug: string,
): Promise<PortfolioItem | null> {
  const rows = await sql<PortfolioItem[]>`
    SELECT * FROM portfolio_items WHERE slug = ${slug} LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * INSERT новой работы. Возвращает id вставленной строки.
 *
 * - Если sort_order не задан явно — выставляем (max+1) среди существующих.
 * - is_featured/featured_order здесь НЕ устанавливаются (управляется
 *   `setFeaturedPortfolio` отдельно).
 */
export async function createPortfolioItem(
  data: PortfolioFormData,
): Promise<{ id: number }> {
  const sortOrder =
    data.sort_order > 0
      ? data.sort_order
      : await nextSortOrder();

  const rows = await sql<{ id: number }[]>`
    INSERT INTO portfolio_items (
      title, slug, description, short_description,
      category_id, category_label, related_product_id,
      client_name, industry, location, year, project_date,
      cover_url, images, video_url,
      is_featured, featured_order, is_published, sort_order,
      seo_title, seo_description, published_at
    )
    VALUES (
      ${data.title},
      ${data.slug},
      ${data.description ?? null},
      ${data.short_description ?? null},
      ${data.category_id ?? null},
      ${data.category_label ?? null},
      ${data.related_product_id ?? null},
      ${data.client_name ?? null},
      ${data.industry ?? null},
      ${data.location ?? null},
      ${data.year ?? null},
      ${data.project_date ?? null},
      ${data.cover_url},
      ${sql.array(data.images)},
      ${data.video_url ?? null},
      false,
      NULL,
      ${data.is_published},
      ${sortOrder},
      ${data.seo_title ?? null},
      ${data.seo_description ?? null},
      ${data.published_at ?? null}
    )
    RETURNING id
  `;

  const inserted = rows[0];
  if (!inserted) throw new Error("Не удалось создать работу");
  return { id: inserted.id };
}

export async function updatePortfolioItem(
  id: number,
  data: PortfolioFormData,
): Promise<void> {
  await sql`
    UPDATE portfolio_items
    SET
      title              = ${data.title},
      slug               = ${data.slug},
      description        = ${data.description ?? null},
      short_description  = ${data.short_description ?? null},
      category_id        = ${data.category_id ?? null},
      category_label     = ${data.category_label ?? null},
      related_product_id = ${data.related_product_id ?? null},
      client_name        = ${data.client_name ?? null},
      industry           = ${data.industry ?? null},
      location           = ${data.location ?? null},
      year               = ${data.year ?? null},
      project_date       = ${data.project_date ?? null},
      cover_url          = ${data.cover_url},
      images             = ${sql.array(data.images)},
      video_url          = ${data.video_url ?? null},
      is_published       = ${data.is_published},
      sort_order         = ${data.sort_order},
      seo_title          = ${data.seo_title ?? null},
      seo_description    = ${data.seo_description ?? null},
      published_at       = ${data.published_at ?? null},
      updated_at         = NOW()
    WHERE id = ${id}
  `;
}

/**
 * Hard-delete работы. Также сбрасывает featured_order, если работа
 * была в featured (на случай, если констрейнт не cascade'ит).
 */
export async function deletePortfolioItem(id: number): Promise<void> {
  await sql.begin(async (tx: Tx) => {
    // Снять с featured, чтобы CHECK не упал и кеш «featured» был корректным.
    await tx`
      UPDATE portfolio_items
      SET is_featured = false, featured_order = NULL, updated_at = NOW()
      WHERE id = ${id} AND is_featured = true
    `;
    await tx`DELETE FROM portfolio_items WHERE id = ${id}`;
  });
}

/**
 * Atomic batch reorder. Принимает массив {id, sort_order} — пишем как есть.
 */
export async function reorderPortfolioItems(
  orders: PortfolioReorderInput,
): Promise<void> {
  if (orders.length === 0) return;
  await sql.begin(async (tx: Tx) => {
    for (const { id, sort_order } of orders) {
      await tx`
        UPDATE portfolio_items
        SET sort_order = ${sort_order}, updated_at = NOW()
        WHERE id = ${id}
      `;
    }
  });
}

async function nextSortOrder(): Promise<number> {
  const rows = await sql<{ max_sort: number | null }[]>`
    SELECT MAX(sort_order)::int AS max_sort FROM portfolio_items
  `;
  return (rows[0]?.max_sort ?? 0) + 1;
}
