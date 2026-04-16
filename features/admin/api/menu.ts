import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { Row, InsertRow } from "@/lib/supabase/table-types";
import type { MenuItemInput } from "@/features/admin/types";

// ── List menu items by position ──

export async function getMenuItems(
  position: "header" | "footer",
): Promise<Row<"menu_items">[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("menu_items")
    .select("*")
    .eq("position", position)
    .order("sort_order", { ascending: true });

  return data ?? [];
}

// ── Create menu item ──

export async function createMenuItem(
  data: MenuItemInput,
): Promise<{ id: number }> {
  const supabase = createAdminClient();

  const insertData: InsertRow<"menu_items"> = {
    parent_id: data.parent_id ?? null,
    position: data.position,
    title: data.title,
    url: data.url,
    icon: data.icon ?? null,
    sort_order: data.sort_order,
    is_active: data.is_active,
    open_in_new_tab: data.open_in_new_tab,
  };

  const { data: item, error } = await supabase
    .from("menu_items")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !item) {
    throw new Error(error?.message ?? "Не удалось создать пункт меню");
  }

  return { id: item.id };
}

// ── Update menu item ──

export async function updateMenuItem(
  id: number,
  data: MenuItemInput,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("menu_items")
    .update({
      parent_id: data.parent_id ?? null,
      position: data.position,
      title: data.title,
      url: data.url,
      icon: data.icon ?? null,
      sort_order: data.sort_order,
      is_active: data.is_active,
      open_in_new_tab: data.open_in_new_tab,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Delete menu item ──

export async function deleteMenuItem(id: number): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Reorder menu items ──

export async function reorderMenuItems(
  position: string,
  ids: number[],
): Promise<void> {
  const supabase = createAdminClient();

  const updates = ids.map((id, index) =>
    supabase
      .from("menu_items")
      .update({ sort_order: index })
      .eq("id", id)
      .eq("position", position),
  );

  const results = await Promise.all(updates);

  for (const result of results) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}
