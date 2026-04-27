"use server";

import { z } from "zod";
import {
  getCategoriesTree,
  getCategoriesFlat,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "@/features/admin/api/categories";
import { requireAdmin } from "@/features/auth/api";
import { categorySchema } from "@/features/admin/schemas/category";
import { logAdminAction } from "@/lib/audit";

// BIGSERIAL id → строка в RSC payload. coerce принимает оба варианта.
const idSchema = z.coerce.number().int().positive();
const reorderItemSchema = z.object({
  id: z.coerce.number().int().positive(),
  sort_order: z.coerce.number().int().nonnegative(),
  parent_id: z.coerce.number().int().positive().nullable(),
});

export async function fetchCategoriesTreeAction() {
  await requireAdmin();
  return getCategoriesTree();
}

export async function fetchCategoriesFlatAction() {
  await requireAdmin();
  return getCategoriesFlat();
}

export async function createCategoryAction(data: unknown) {
  const profile = await requireAdmin();
  const validated = categorySchema.parse(data);
  const result = await createCategory(validated);
  await logAdminAction(
    profile.id,
    "categories.create",
    "categories",
    (result as { id?: number | string } | null)?.id ?? null,
    validated,
  );
  return result;
}

export async function updateCategoryAction(id: number, data: unknown) {
  const profile = await requireAdmin();
  const validatedId = idSchema.parse(id);
  const validated = categorySchema.parse(data);
  await updateCategory(validatedId, validated);
  await logAdminAction(
    profile.id,
    "categories.update",
    "categories",
    validatedId,
    validated,
  );
}

export async function deleteCategoryAction(id: number) {
  const profile = await requireAdmin();
  const validated = idSchema.parse(id);
  await deleteCategory(validated);
  await logAdminAction(
    profile.id,
    "categories.delete",
    "categories",
    validated,
    null,
  );
}

export async function reorderCategoriesAction(
  items: { id: number; sort_order: number; parent_id: number | null }[],
) {
  const profile = await requireAdmin();
  const validated = z.array(reorderItemSchema).parse(items);
  await reorderCategories(validated);
  await logAdminAction(
    profile.id,
    "categories.reorder",
    "categories",
    null,
    { count: validated.length },
  );
}
