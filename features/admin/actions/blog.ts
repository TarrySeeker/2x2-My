"use server";

import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import {
  getBlogPosts,
  getBlogCategories,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
} from "@/features/admin/api/blog";
import type { BlogPostFilters } from "@/features/admin/types";
import { requireAuth } from "@/features/auth/api";
import {
  blogPostSchema,
  blogCategorySchema,
} from "@/features/admin/schemas/blog";
import { sanitizeHtml } from "@/lib/sanitize/html";
import { BLOG_POSTS_CACHE_TAG } from "@/lib/data/blog";
import { logAdminAction } from "@/lib/audit";

/**
 * После любой мутации блога — инвалидируем публичный кеш `BLOG_POSTS_CACHE_TAG`
 * и пути `/blog`, `/blog/[slug]`. Иначе пост, опубликованный/обновлённый
 * через админку, появится на витрине только через TTL `unstable_cache` (60 с)
 * + RSC fetch cache (~120 с).
 */
function revalidatePublicBlog(slug?: string | null) {
  updateTag(BLOG_POSTS_CACHE_TAG);
  revalidatePath("/blog");
  if (slug) {
    revalidatePath(`/blog/${slug}`);
  }
}

const idSchema = z.number().int().positive();

/** Blog actions are available to content role too */
async function requireContentAccess() {
  const profile = await requireAuth();
  if (!["owner", "manager", "content"].includes(profile.role)) {
    throw new Error("Недостаточно прав");
  }
  return profile;
}

// ── Fetch wrappers ──

export async function fetchBlogPostsAction(filters: BlogPostFilters) {
  await requireContentAccess();
  return getBlogPosts(filters);
}

export async function fetchBlogCategoriesAction() {
  await requireContentAccess();
  return getBlogCategories();
}

// ── Blog Posts ──

export async function createBlogPostAction(data: unknown) {
  const profile = await requireContentAccess();
  const validated = blogPostSchema.parse(data);
  // Сначала Zod-валидация, потом sanitize HTML — TipTap-контент
  // может содержать произвольную разметку, нам нужно вырезать
  // <script>, on*-атрибуты и т.п. до записи в БД.
  validated.content = sanitizeHtml(validated.content);
  const result = await createBlogPost(validated, profile.id);
  revalidatePath("/admin/blog");
  revalidatePublicBlog(validated.slug);
  await logAdminAction(
    profile.id,
    "blog.post.create",
    "blog_posts",
    (result as { id?: number | string } | null)?.id ?? null,
    { slug: validated.slug, title: validated.title, status: validated.status },
  );
  return result;
}

export async function updateBlogPostAction(id: number, data: unknown) {
  const profile = await requireContentAccess();
  const validatedId = idSchema.parse(id);
  const validated = blogPostSchema.parse(data);
  validated.content = sanitizeHtml(validated.content);
  await updateBlogPost(validatedId, validated);
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${validatedId}`);
  revalidatePublicBlog(validated.slug);
  await logAdminAction(
    profile.id,
    "blog.post.update",
    "blog_posts",
    validatedId,
    { slug: validated.slug, title: validated.title, status: validated.status },
  );
}

export async function deleteBlogPostAction(id: number) {
  const profile = await requireContentAccess();
  const validated = idSchema.parse(id);
  await deleteBlogPost(validated);
  revalidatePath("/admin/blog");
  revalidatePublicBlog(null);
  await logAdminAction(
    profile.id,
    "blog.post.delete",
    "blog_posts",
    validated,
    null,
  );
}

// ── Blog Categories ──

export async function createBlogCategoryAction(data: unknown) {
  const profile = await requireContentAccess();
  const validated = blogCategorySchema.parse(data);
  const result = await createBlogCategory(validated);
  revalidatePath("/admin/blog");
  await logAdminAction(
    profile.id,
    "blog.category.create",
    "blog_categories",
    (result as { id?: number | string } | null)?.id ?? null,
    validated,
  );
  return result;
}

export async function updateBlogCategoryAction(id: number, data: unknown) {
  const profile = await requireContentAccess();
  const validatedId = idSchema.parse(id);
  const validated = blogCategorySchema.parse(data);
  await updateBlogCategory(validatedId, validated);
  revalidatePath("/admin/blog");
  await logAdminAction(
    profile.id,
    "blog.category.update",
    "blog_categories",
    validatedId,
    validated,
  );
}

export async function deleteBlogCategoryAction(id: number) {
  const profile = await requireContentAccess();
  const validated = idSchema.parse(id);
  await deleteBlogCategory(validated);
  revalidatePath("/admin/blog");
  await logAdminAction(
    profile.id,
    "blog.category.delete",
    "blog_categories",
    validated,
    null,
  );
}
