import "server-only";

import { sql, type Tx } from "@/lib/db/client";
import type { PortfolioCategory } from "@/types";
import type {
  PortfolioCategoryFormData,
  PortfolioCategoryReorderInput,
} from "@/features/admin/schemas/portfolio-category";

/**
 * Data-layer для справочника категорий портфолио (`portfolio_categories`).
 *
 * Создан в db/migrations/031_portfolio_categories.sql. Label записи
 * совпадает со значением `portfolio_items.category_label` (без FK —
 * слабая связь, как и для service_categories).
 *
 * Cache-invalidation выполняется на уровне actions
 * (`features/admin/actions/portfolio-categories.ts`).
 *
 * ВАЖНО: для админки используем `listAllPortfolioCategoriesForAdmin()`
 * (пустой массив при недоступной БД, без stub-fallback'ов — иначе UPDATE
 * по фиктивному id silent no-op'ом ничего не меняет; см.
 * LESSONS_LEARNED Категория 3).
 *
 * Для витрины — `listPublishedPortfolioCategories()`.
 */

export const PORTFOLIO_CATEGORIES_CACHE_TAG = "portfolio-categories";

/**
 * Полный список (включая снятые с публикации) для администратора.
 * Сортировка: published-первыми, затем по sort_order, затем по id.
 */
export async function listAllPortfolioCategoriesForAdmin(): Promise<
  PortfolioCategory[]
> {
  try {
    return await sql<PortfolioCategory[]>`
      SELECT *
      FROM portfolio_categories
      ORDER BY is_published DESC, sort_order ASC, id ASC
    `;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[listAllPortfolioCategoriesForAdmin] DB request failed:",
        err,
      );
    }
    return [];
  }
}

/**
 * Только опубликованные. Используется на витрине (/portfolio) для
 * фильтра-кнопок и для select'а в форме портфолио в админке.
 */
export async function listPublishedPortfolioCategories(): Promise<
  PortfolioCategory[]
> {
  try {
    return await sql<PortfolioCategory[]>`
      SELECT *
      FROM portfolio_categories
      WHERE is_published = true
      ORDER BY sort_order ASC, id ASC
    `;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[listPublishedPortfolioCategories] DB request failed:",
        err,
      );
    }
    return [];
  }
}

export async function getPortfolioCategoryById(
  id: number,
): Promise<PortfolioCategory | null> {
  const rows = await sql<PortfolioCategory[]>`
    SELECT * FROM portfolio_categories WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getPortfolioCategoryBySlug(
  slug: string,
): Promise<PortfolioCategory | null> {
  const rows = await sql<PortfolioCategory[]>`
    SELECT * FROM portfolio_categories WHERE slug = ${slug} LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * INSERT новой категории. Возвращает id вставленной строки.
 *
 * Если sort_order не задан явно (== 0) — выставляем (max+10) среди
 * существующих, чтобы новая категория ушла в конец списка.
 */
export async function createPortfolioCategory(
  data: PortfolioCategoryFormData,
): Promise<{ id: number }> {
  const sortOrder =
    data.sort_order > 0 ? data.sort_order : await nextSortOrder();

  const rows = await sql<{ id: number }[]>`
    INSERT INTO portfolio_categories (
      slug, label, description, sort_order, is_published
    )
    VALUES (
      ${data.slug.toLowerCase()},
      ${data.label},
      ${data.description ?? null},
      ${sortOrder},
      ${data.is_published}
    )
    RETURNING id
  `;

  const inserted = rows[0];
  if (!inserted) throw new Error("Не удалось создать категорию");
  return { id: inserted.id };
}

export async function updatePortfolioCategory(
  id: number,
  data: PortfolioCategoryFormData,
): Promise<void> {
  await sql`
    UPDATE portfolio_categories
    SET
      slug         = ${data.slug.toLowerCase()},
      label        = ${data.label},
      description  = ${data.description ?? null},
      sort_order   = ${data.sort_order},
      is_published = ${data.is_published},
      updated_at   = NOW()
    WHERE id = ${id}
  `;
}

/**
 * Hard-delete категории.
 *
 * Защита: если есть `portfolio_items.category_label = <label>` — отказываем
 * с понятным сообщением (клиент должен сначала переназначить работы).
 * Это аналог защиты deleteServiceCategory().
 *
 * ВАЖНО: для портфолио сравниваем по LABEL, а не по slug — потому что
 * именно label лежит в portfolio_items.category_label (см. комментарий
 * в db/migrations/031_portfolio_categories.sql).
 */
export async function deletePortfolioCategory(id: number): Promise<void> {
  // Узнаём label удаляемой категории
  const target = await sql<{ label: string }[]>`
    SELECT label FROM portfolio_categories WHERE id = ${id} LIMIT 1
  `;
  const label = target[0]?.label;
  if (!label) {
    // Уже удалено — выходим без ошибки (идемпотентность для UI).
    return;
  }

  const usage = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM portfolio_items
    WHERE category_label = ${label}
  `;
  const usageCount = usage[0]?.count ?? 0;
  if (usageCount > 0) {
    throw new Error(
      `Невозможно удалить: ${usageCount} работ(ы) используют эту категорию. Сначала переназначьте их.`,
    );
  }

  await sql`DELETE FROM portfolio_categories WHERE id = ${id}`;
}

/**
 * Atomic batch reorder. Принимает массив {id, sort_order} — пишем как
 * есть. Используется при drag-n-drop в админке.
 */
export async function reorderPortfolioCategories(
  orders: PortfolioCategoryReorderInput,
): Promise<void> {
  if (orders.length === 0) return;
  await sql.begin(async (tx: Tx) => {
    for (const { id, sort_order } of orders) {
      await tx`
        UPDATE portfolio_categories
        SET sort_order = ${sort_order}, updated_at = NOW()
        WHERE id = ${id}
      `;
    }
  });
}

async function nextSortOrder(): Promise<number> {
  const rows = await sql<{ max_sort: number | null }[]>`
    SELECT MAX(sort_order)::int AS max_sort FROM portfolio_categories
  `;
  return (rows[0]?.max_sort ?? 0) + 10;
}
