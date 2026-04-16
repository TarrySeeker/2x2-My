import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { Row, InsertRow } from "@/lib/supabase/table-types";
import type { PageInput } from "@/features/admin/types";

// ── List pages ──

export async function getPages(): Promise<Row<"pages">[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("pages")
    .select("*")
    .order("sort_order", { ascending: true });

  return data ?? [];
}

// ── Get single page ──

export async function getPageById(id: number): Promise<Row<"pages"> | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}

// ── Create page ──

export async function createPage(data: PageInput): Promise<{ id: number }> {
  const supabase = createAdminClient();

  const insertData: InsertRow<"pages"> = {
    title: data.title,
    slug: data.slug,
    content: data.content,
    excerpt: data.excerpt ?? null,
    cover_url: data.cover_url ?? null,
    seo_title: data.seo_title ?? null,
    seo_description: data.seo_description ?? null,
    seo_keywords: data.seo_keywords ?? null,
    is_active: data.is_active,
    show_in_footer: data.show_in_footer,
    sort_order: data.sort_order,
  };

  const { data: page, error } = await supabase
    .from("pages")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !page) {
    throw new Error(error?.message ?? "Не удалось создать страницу");
  }

  return { id: page.id };
}

// ── Update page ──

export async function updatePage(id: number, data: PageInput): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("pages")
    .update({
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt ?? null,
      cover_url: data.cover_url ?? null,
      seo_title: data.seo_title ?? null,
      seo_description: data.seo_description ?? null,
      seo_keywords: data.seo_keywords ?? null,
      is_active: data.is_active,
      show_in_footer: data.show_in_footer,
      sort_order: data.sort_order,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Delete page ──

export async function deletePage(id: number): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("pages")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
