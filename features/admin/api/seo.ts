import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { Json } from "@/types/database";
import type { Row, InsertRow } from "@/lib/supabase/table-types";
import type { SeoEntity, RedirectInput, SeoTemplates } from "@/features/admin/types";

// ── SEO entities ──

export async function getSeoEntities(
  type: "product" | "category" | "page" | "post",
): Promise<SeoEntity[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();

  switch (type) {
    case "product": {
      const { data } = await supabase
        .from("products")
        .select("id, name, slug, seo_title, seo_description")
        .is("deleted_at", null)
        .order("name", { ascending: true });

      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        seo_title: p.seo_title,
        seo_description: p.seo_description,
        filled: !!(p.seo_title && p.seo_description),
      }));
    }

    case "category": {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, seo_title, seo_description")
        .order("name", { ascending: true });

      return (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        seo_title: c.seo_title,
        seo_description: c.seo_description,
        filled: !!(c.seo_title && c.seo_description),
      }));
    }

    case "page": {
      const { data } = await supabase
        .from("pages")
        .select("id, title, slug, seo_title, seo_description")
        .order("title", { ascending: true });

      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.title,
        slug: p.slug,
        seo_title: p.seo_title,
        seo_description: p.seo_description,
        filled: !!(p.seo_title && p.seo_description),
      }));
    }

    case "post": {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, seo_title, seo_description")
        .order("title", { ascending: true });

      return (data ?? []).map((p) => ({
        id: p.id,
        name: p.title,
        slug: p.slug,
        seo_title: p.seo_title,
        seo_description: p.seo_description,
        filled: !!(p.seo_title && p.seo_description),
      }));
    }
  }
}

// ── Redirects ──

export async function getRedirects(): Promise<Row<"redirects">[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("redirects")
    .select("*")
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function createRedirect(
  data: RedirectInput,
): Promise<{ id: number }> {
  const supabase = createAdminClient();

  const insertData: InsertRow<"redirects"> = {
    from_path: data.from_path,
    to_path: data.to_path,
    type: data.type,
    is_active: data.is_active,
  };

  const { data: redirect, error } = await supabase
    .from("redirects")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !redirect) {
    throw new Error(error?.message ?? "Не удалось создать редирект");
  }

  return { id: redirect.id };
}

export async function updateRedirect(
  id: number,
  data: RedirectInput,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("redirects")
    .update({
      from_path: data.from_path,
      to_path: data.to_path,
      type: data.type,
      is_active: data.is_active,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteRedirect(id: number): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("redirects")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── SEO Templates (stored in settings table) ──

export async function getSeoTemplates(): Promise<SeoTemplates> {
  if (!isSupabaseConfigured()) {
    return { seo_title_template: "", seo_description_template: "" };
  }

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["seo_title_template", "seo_description_template"]);

  const templates: SeoTemplates = {
    seo_title_template: "",
    seo_description_template: "",
  };

  for (const row of data ?? []) {
    if (row.key === "seo_title_template" && typeof row.value === "string") {
      templates.seo_title_template = row.value;
    }
    if (row.key === "seo_description_template" && typeof row.value === "string") {
      templates.seo_description_template = row.value;
    }
  }

  return templates;
}

export async function saveSeoTemplates(
  templates: SeoTemplates,
): Promise<void> {
  const supabase = createAdminClient();

  const entries: { key: string; value: Json; desc: string }[] = [
    {
      key: "seo_title_template",
      value: templates.seo_title_template,
      desc: "SEO шаблон заголовка",
    },
    {
      key: "seo_description_template",
      value: templates.seo_description_template,
      desc: "SEO шаблон описания",
    },
  ];

  for (const entry of entries) {
    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          key: entry.key,
          value: entry.value,
          description: entry.desc,
          is_public: false,
        },
        { onConflict: "key" },
      );

    if (error) throw new Error(error.message);
  }
}
