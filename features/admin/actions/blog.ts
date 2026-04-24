"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
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
  return result;
}

export async function updateBlogPostAction(id: number, data: unknown) {
  await requireContentAccess();
  const validatedId = idSchema.parse(id);
  const validated = blogPostSchema.parse(data);
  validated.content = sanitizeHtml(validated.content);
  await updateBlogPost(validatedId, validated);
  revalidatePath("/admin/blog");
  revalidatePath(`/admin/blog/${validatedId}`);
}

export async function deleteBlogPostAction(id: number) {
  await requireContentAccess();
  const validated = idSchema.parse(id);
  await deleteBlogPost(validated);
  revalidatePath("/admin/blog");
}

// ── Blog Categories ──

export async function createBlogCategoryAction(data: unknown) {
  await requireContentAccess();
  const validated = blogCategorySchema.parse(data);
  const result = await createBlogCategory(validated);
  revalidatePath("/admin/blog");
  return result;
}

export async function updateBlogCategoryAction(id: number, data: unknown) {
  await requireContentAccess();
  const validatedId = idSchema.parse(id);
  const validated = blogCategorySchema.parse(data);
  await updateBlogCategory(validatedId, validated);
  revalidatePath("/admin/blog");
}

export async function deleteBlogCategoryAction(id: number) {
  await requireContentAccess();
  const validated = idSchema.parse(id);
  await deleteBlogCategory(validated);
  revalidatePath("/admin/blog");
}
