import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { Row } from "@/lib/supabase/table-types";
import type { BlogPostFilters, BlogPostFull, BlogPostInput, BlogCategoryInput } from "@/features/admin/types";
import type { InsertRow, UpdateRow } from "@/lib/supabase/table-types";

// ── Blog Posts ──

export async function getBlogPosts(
  filters: BlogPostFilters,
): Promise<{ data: BlogPostFull[]; total: number }> {
  if (!isSupabaseConfigured()) return { data: [], total: 0 };

  const supabase = createAdminClient();
  const { page, perPage, search, status, category_id } = filters;

  let query = supabase
    .from("blog_posts")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (status) {
    query = query.eq("status", status);
  }
  if (category_id) {
    query = query.eq("category_id", category_id);
  }
  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data: posts, count } = await query;

  if (!posts) return { data: [], total: 0 };

  // Fetch category names and author names
  const categoryIds = [...new Set(posts.map((p) => p.category_id).filter(Boolean))] as number[];
  const authorIds = [...new Set(posts.map((p) => p.author_id).filter(Boolean))] as string[];

  const categoryMap = new Map<number, string>();
  const authorMap = new Map<string, string>();

  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from("blog_categories")
      .select("id, name")
      .in("id", categoryIds);
    for (const cat of cats ?? []) {
      categoryMap.set(cat.id, cat.name);
    }
  }

  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);
    for (const p of profiles ?? []) {
      authorMap.set(p.id, p.full_name ?? p.id);
    }
  }

  const result: BlogPostFull[] = posts.map((post) => ({
    ...post,
    category_name: post.category_id ? (categoryMap.get(post.category_id) ?? null) : null,
    author_full_name: post.author_id ? (authorMap.get(post.author_id) ?? null) : null,
  }));

  return { data: result, total: count ?? 0 };
}

export async function getBlogPostById(id: number): Promise<BlogPostFull | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminClient();

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!post) return null;

  let category_name: string | null = null;
  let author_full_name: string | null = null;

  if (post.category_id) {
    const { data: cat } = await supabase
      .from("blog_categories")
      .select("name")
      .eq("id", post.category_id)
      .single();
    category_name = cat?.name ?? null;
  }

  if (post.author_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", post.author_id)
      .single();
    author_full_name = profile?.full_name ?? null;
  }

  return { ...post, category_name, author_full_name };
}

export async function createBlogPost(
  data: BlogPostInput,
  authorId: string,
): Promise<{ id: number }> {
  const supabase = createAdminClient();

  const insertData: InsertRow<"blog_posts"> = {
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt ?? null,
    content: data.content,
    cover_image_url: data.cover_image_url ?? null,
    category_id: data.category_id ?? null,
    author_id: authorId,
    author_name: null,
    status: data.status,
    published_at: data.status === "published" ? (data.published_at ?? new Date().toISOString()) : data.published_at ?? null,
    seo_title: data.seo_title ?? null,
    seo_description: data.seo_description ?? null,
    seo_keywords: data.seo_keywords ?? null,
    reading_time: data.reading_time ?? null,
    tags: data.tags ?? [],
  };

  const { data: post, error } = await supabase
    .from("blog_posts")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !post) {
    throw new Error(error?.message ?? "Не удалось создать статью");
  }

  return { id: post.id };
}

export async function updateBlogPost(
  id: number,
  data: BlogPostInput,
): Promise<void> {
  const supabase = createAdminClient();

  const updateData: UpdateRow<"blog_posts"> = {
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt ?? null,
    content: data.content,
    cover_image_url: data.cover_image_url ?? null,
    category_id: data.category_id ?? null,
    status: data.status,
    published_at: data.status === "published" ? (data.published_at ?? new Date().toISOString()) : data.published_at ?? null,
    seo_title: data.seo_title ?? null,
    seo_description: data.seo_description ?? null,
    seo_keywords: data.seo_keywords ?? null,
    reading_time: data.reading_time ?? null,
    tags: data.tags ?? [],
  };

  const { error } = await supabase
    .from("blog_posts")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteBlogPost(id: number): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("blog_posts")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Blog Categories ──

export async function getBlogCategories(): Promise<Row<"blog_categories">[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("blog_categories")
    .select("*")
    .order("sort_order", { ascending: true });

  return data ?? [];
}

export async function createBlogCategory(
  data: BlogCategoryInput,
): Promise<{ id: number }> {
  const supabase = createAdminClient();

  const insertData: InsertRow<"blog_categories"> = {
    name: data.name,
    slug: data.slug,
    description: data.description ?? null,
    sort_order: data.sort_order,
  };

  const { data: cat, error } = await supabase
    .from("blog_categories")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !cat) {
    throw new Error(error?.message ?? "Не удалось создать категорию блога");
  }

  return { id: cat.id };
}

export async function updateBlogCategory(
  id: number,
  data: BlogCategoryInput,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("blog_categories")
    .update({
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      sort_order: data.sort_order,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteBlogCategory(id: number): Promise<void> {
  const supabase = createAdminClient();

  // Unlink posts from this category before deleting
  await supabase
    .from("blog_posts")
    .update({ category_id: null })
    .eq("category_id", id);

  const { error } = await supabase
    .from("blog_categories")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
