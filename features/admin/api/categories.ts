import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { CategoryTreeNode } from "@/features/admin/types";
import type { CategoryFormData } from "@/features/admin/schemas/category";
import type { Row, InsertRow, UpdateRow } from "@/lib/supabase/table-types";

type CategoryRow = Row<"categories">;

// ── Build tree from flat list ──

function buildTree(categories: CategoryRow[]): CategoryTreeNode[] {
  const map = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // Initialize nodes
  for (const cat of categories) {
    map.set(cat.id, { ...cat, children: [] });
  }

  // Build parent-child relationships
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
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  return buildTree(data ?? []);
}

export async function getCategoriesFlat(): Promise<CategoryRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  return data ?? [];
}

export async function createCategory(
  data: CategoryFormData,
): Promise<{ id: number }> {
  const supabase = createAdminClient();

  const insertData: InsertRow<"categories"> = {
    name: data.name,
    slug: data.slug,
    parent_id: data.parent_id ?? null,
    description: data.description ?? null,
    icon: data.icon ?? null,
    image_url: data.image_url ?? null,
    cover_url: data.cover_url ?? null,
    is_active: data.is_active,
    is_featured: data.is_featured,
    sort_order: data.sort_order,
    seo_title: data.seo_title ?? null,
    seo_description: data.seo_description ?? null,
    seo_keywords: data.seo_keywords ?? null,
  };

  const { data: category, error } = await supabase
    .from("categories")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !category) {
    throw new Error(error?.message ?? "Не удалось создать категорию");
  }

  return { id: category.id };
}

export async function updateCategory(
  id: number,
  data: CategoryFormData,
): Promise<void> {
  const supabase = createAdminClient();

  const updateData: UpdateRow<"categories"> = {
    name: data.name,
    slug: data.slug,
    parent_id: data.parent_id ?? null,
    description: data.description ?? null,
    icon: data.icon ?? null,
    image_url: data.image_url ?? null,
    cover_url: data.cover_url ?? null,
    is_active: data.is_active,
    is_featured: data.is_featured,
    sort_order: data.sort_order,
    seo_title: data.seo_title ?? null,
    seo_description: data.seo_description ?? null,
    seo_keywords: data.seo_keywords ?? null,
  };

  const { error } = await supabase
    .from("categories")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: number): Promise<void> {
  const supabase = createAdminClient();

  // Check if any products belong to this category
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id)
    .is("deleted_at", null);

  if (count && count > 0) {
    throw new Error(
      `Невозможно удалить категорию: ${count} товар(ов) принадлежат ей. Сначала переместите товары.`,
    );
  }

  // Check for subcategories
  const { count: childCount } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", id);

  if (childCount && childCount > 0) {
    throw new Error(
      `Невозможно удалить категорию: есть ${childCount} подкатегорий. Сначала переместите или удалите их.`,
    );
  }

  const { error } = await supabase.from("categories").delete().eq("id", id);

  if (error) throw new Error(error.message);
}

export async function reorderCategories(
  items: { id: number; sort_order: number; parent_id: number | null }[],
): Promise<void> {
  if (items.length === 0) return;

  const supabase = createAdminClient();

  // Update each category's sort_order and parent_id
  const updates = items.map((item) =>
    supabase
      .from("categories")
      .update({ sort_order: item.sort_order, parent_id: item.parent_id })
      .eq("id", item.id),
  );

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw new Error(firstError.error.message);
}
