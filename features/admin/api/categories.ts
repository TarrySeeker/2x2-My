import "server-only";

import { sql, type Tx } from "@/lib/db/client";
import type { CategoryTreeNode } from "@/features/admin/types";
import type { CategoryFormData } from "@/features/admin/schemas/category";
import type { Row } from "@/lib/db/table-types";

type CategoryRow = Row<"categories">;

// ── Build tree from flat list ──

function buildTree(categories: CategoryRow[]): CategoryTreeNode[] {
  const map = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of categories) {
    const node = map.get(cat.id)!;
    if (cat.parent_id && map.has(cat.parent_id)) {
      map.get(cat.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ── Public API ──

export async function getCategoriesTree(): Promise<CategoryTreeNode[]> {
  try {
    const rows = await sql<CategoryRow[]>`
      SELECT *
      FROM categories
      ORDER BY sort_order ASC
    `;
    return buildTree(rows);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getCategoriesTree] DB request failed:", err);
    }
    return [];
  }
}

export async function getCategoriesFlat(): Promise<CategoryRow[]> {
  try {
    const rows = await sql<CategoryRow[]>`
      SELECT *
      FROM categories
      ORDER BY sort_order ASC
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getCategoriesFlat] DB request failed:", err);
    }
    return [];
  }
}

export async function createCategory(
  data: CategoryFormData,
): Promise<{ id: number }> {
  const rows = await sql<{ id: number }[]>`
    INSERT INTO categories (
      name, slug, parent_id, description, icon, image_url, cover_url,
      is_active, is_featured, sort_order,
      seo_title, seo_description, seo_keywords
    )
    VALUES (
      ${data.name},
      ${data.slug},
      ${data.parent_id ?? null},
      ${data.description ?? null},
      ${data.icon ?? null},
      ${data.image_url ?? null},
      ${data.cover_url ?? null},
      ${data.is_active},
      ${data.is_featured},
      ${data.sort_order},
      ${data.seo_title ?? null},
      ${data.seo_description ?? null},
      ${data.seo_keywords ?? null}
    )
    RETURNING id
  `;

  const inserted = rows[0];
  if (!inserted) throw new Error("Не удалось создать категорию");
  return { id: inserted.id };
}

export async function updateCategory(
  id: number,
  data: CategoryFormData,
): Promise<void> {
  await sql`
    UPDATE categories
    SET
      name = ${data.name},
      slug = ${data.slug},
      parent_id = ${data.parent_id ?? null},
      description = ${data.description ?? null},
      icon = ${data.icon ?? null},
      image_url = ${data.image_url ?? null},
      cover_url = ${data.cover_url ?? null},
      is_active = ${data.is_active},
      is_featured = ${data.is_featured},
      sort_order = ${data.sort_order},
      seo_title = ${data.seo_title ?? null},
      seo_description = ${data.seo_description ?? null},
      seo_keywords = ${data.seo_keywords ?? null}
    WHERE id = ${id}
  `;
}

export async function deleteCategory(id: number): Promise<void> {
  // Проверка: есть ли активные товары в категории
  const productCheck = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM products
    WHERE category_id = ${id}
      AND deleted_at IS NULL
  `;

  const productCount = productCheck[0]?.count ?? 0;
  if (productCount > 0) {
    throw new Error(
      `Невозможно удалить категорию: ${productCount} товар(ов) принадлежат ей. Сначала переместите товары.`,
    );
  }

  // Проверка: есть ли подкатегории
  const childCheck = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM categories
    WHERE parent_id = ${id}
  `;
  const childCount = childCheck[0]?.count ?? 0;
  if (childCount > 0) {
    throw new Error(
      `Невозможно удалить категорию: есть ${childCount} подкатегорий. Сначала переместите или удалите их.`,
    );
  }

  await sql`DELETE FROM categories WHERE id = ${id}`;
}

export async function reorderCategories(
  items: { id: number; sort_order: number; parent_id: number | null }[],
): Promise<void> {
  if (items.length === 0) return;

  await sql.begin(async (tx: Tx) => {
    for (const item of items) {
      await tx`
        UPDATE categories
        SET
          sort_order = ${item.sort_order},
          parent_id = ${item.parent_id}
        WHERE id = ${item.id}
      `;
    }
  });
}
