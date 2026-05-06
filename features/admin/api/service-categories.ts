import "server-only";

import { sql, type Tx } from "@/lib/db/client";
import type { ServiceCategory } from "@/types";
import type {
  ServiceCategoryFormData,
  ServiceCategoryReorderInput,
} from "@/features/admin/schemas/service-category";

/**
 * Data-layer для справочника категорий услуг (`service_categories`).
 *
 * Создан в db/migrations/029_service_categories.sql. Slug записи
 * совпадает со значением `services.category` (без FK — слабая связь).
 *
 * Cache-invalidation выполняется на уровне actions
 * (`features/admin/actions/service-categories.ts`).
 *
 * ВАЖНО: для админки используем `listAllServiceCategoriesForAdmin()`
 * (пустой массив при недоступной БД, без stub-fallback'ов — иначе UPDATE
 * по фиктивному id silent no-op'ом ничего не меняет; см.
 * LESSONS_LEARNED Категория 3).
 *
 * Для витрины — `listPublishedServiceCategories()`.
 */

export const SERVICE_CATEGORIES_CACHE_TAG = "service-categories";

/**
 * Полный список (включая снятые с публикации) для администратора.
 * Сортировка: published-первыми, затем по sort_order, затем по id.
 */
export async function listAllServiceCategoriesForAdmin(): Promise<
  ServiceCategory[]
> {
  try {
    return await sql<ServiceCategory[]>`
      SELECT *
      FROM service_categories
      ORDER BY is_published DESC, sort_order ASC, id ASC
    `;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[listAllServiceCategoriesForAdmin] DB request failed:",
        err,
      );
    }
    return [];
  }
}

/**
 * Только опубликованные. Используется на витрине (/services) для
 * группировки карточек услуг и для выпадающих списков в формах.
 */
export async function listPublishedServiceCategories(): Promise<
  ServiceCategory[]
> {
  try {
    return await sql<ServiceCategory[]>`
      SELECT *
      FROM service_categories
      WHERE is_published = true
      ORDER BY sort_order ASC, id ASC
    `;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[listPublishedServiceCategories] DB request failed:",
        err,
      );
    }
    return [];
  }
}

export async function getServiceCategoryById(
  id: number,
): Promise<ServiceCategory | null> {
  const rows = await sql<ServiceCategory[]>`
    SELECT * FROM service_categories WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getServiceCategoryBySlug(
  slug: string,
): Promise<ServiceCategory | null> {
  const rows = await sql<ServiceCategory[]>`
    SELECT * FROM service_categories WHERE slug = ${slug} LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * INSERT новой категории. Возвращает id вставленной строки.
 *
 * Если sort_order не задан явно (== 0) — выставляем (max+10) среди
 * существующих, чтобы новая категория ушла в конец списка.
 */
export async function createServiceCategory(
  data: ServiceCategoryFormData,
): Promise<{ id: number }> {
  const sortOrder =
    data.sort_order > 0 ? data.sort_order : await nextSortOrder();

  const rows = await sql<{ id: number }[]>`
    INSERT INTO service_categories (
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

export async function updateServiceCategory(
  id: number,
  data: ServiceCategoryFormData,
): Promise<void> {
  await sql`
    UPDATE service_categories
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
 * Защита: если есть `services.category = <slug>` — отказываем с
 * понятным сообщением (клиент должен сначала переназначить услуги).
 * Это аналог защиты deleteCategory() в features/admin/api/categories.ts.
 */
export async function deleteServiceCategory(id: number): Promise<void> {
  // Узнаём slug удаляемой категории
  const target = await sql<{ slug: string }[]>`
    SELECT slug FROM service_categories WHERE id = ${id} LIMIT 1
  `;
  const slug = target[0]?.slug;
  if (!slug) {
    // Уже удалено — выходим без ошибки (идемпотентность для UI).
    return;
  }

  const usage = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM services WHERE category = ${slug}
  `;
  const usageCount = usage[0]?.count ?? 0;
  if (usageCount > 0) {
    throw new Error(
      `Невозможно удалить: ${usageCount} услуг(а) используют эту категорию. Сначала переназначьте их.`,
    );
  }

  await sql`DELETE FROM service_categories WHERE id = ${id}`;
}

/**
 * Atomic batch reorder. Принимает массив {id, sort_order} — пишем как
 * есть. Используется при drag-n-drop в админке.
 */
export async function reorderServiceCategories(
  orders: ServiceCategoryReorderInput,
): Promise<void> {
  if (orders.length === 0) return;
  await sql.begin(async (tx: Tx) => {
    for (const { id, sort_order } of orders) {
      await tx`
        UPDATE service_categories
        SET sort_order = ${sort_order}, updated_at = NOW()
        WHERE id = ${id}
      `;
    }
  });
}

async function nextSortOrder(): Promise<number> {
  const rows = await sql<{ max_sort: number | null }[]>`
    SELECT MAX(sort_order)::int AS max_sort FROM service_categories
  `;
  return (rows[0]?.max_sort ?? 0) + 10;
}
