import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { Row, InsertRow } from "@/lib/supabase/table-types";
import type { BannerInput } from "@/features/admin/types";

// ── List banners ──

export async function getBanners(): Promise<Row<"banners">[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true });

  return data ?? [];
}

// ── Create banner ──

export async function createBanner(
  data: BannerInput,
): Promise<{ id: number }> {
  const supabase = createAdminClient();

  // Get max sort_order for auto-positioning
  const { data: lastBanner } = await supabase
    .from("banners")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (lastBanner?.sort_order ?? 0) + 1;

  const insertData: InsertRow<"banners"> = {
    title: data.title ?? null,
    subtitle: data.subtitle ?? null,
    description: data.description ?? null,
    image_url: data.image_url,
    mobile_image_url: data.mobile_image_url ?? null,
    link: data.link ?? null,
    button_text: data.button_text ?? null,
    badge: data.badge ?? null,
    position: data.position,
    sort_order: nextOrder,
    is_active: data.is_active,
    active_from: data.active_from ?? null,
    active_to: data.active_to ?? null,
  };

  const { data: banner, error } = await supabase
    .from("banners")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !banner) {
    throw new Error(error?.message ?? "Не удалось создать баннер");
  }

  return { id: banner.id };
}

// ── Update banner ──

export async function updateBanner(
  id: number,
  data: BannerInput,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("banners")
    .update({
      title: data.title ?? null,
      subtitle: data.subtitle ?? null,
      description: data.description ?? null,
      image_url: data.image_url,
      mobile_image_url: data.mobile_image_url ?? null,
      link: data.link ?? null,
      button_text: data.button_text ?? null,
      badge: data.badge ?? null,
      position: data.position,
      is_active: data.is_active,
      active_from: data.active_from ?? null,
      active_to: data.active_to ?? null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Delete banner ──

export async function deleteBanner(id: number): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("banners")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Reorder banners ──

export async function reorderBanners(ids: number[]): Promise<void> {
  const supabase = createAdminClient();

  // Update sort_order for each banner based on position in array
  const updates = ids.map((id, index) =>
    supabase
      .from("banners")
      .update({ sort_order: index })
      .eq("id", id),
  );

  const results = await Promise.all(updates);

  for (const result of results) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}
