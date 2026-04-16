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

const idSchema = z.number().int().positive();
const reorderItemSchema = z.object({
  id: z.number().int().positive(),
  sort_order: z.number().int().nonnegative(),
  parent_id: z.number().int().positive().nullable(),
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
  await requireAdmin();
  const validated = categorySchema.parse(data);
  return createCategory(validated);
}

export async function updateCategoryAction(id: number, data: unknown) {
  await requireAdmin();
  const validatedId = idSchema.parse(id);
  const validated = categorySchema.parse(data);
  await updateCategory(validatedId, validated);
}

export async function deleteCategoryAction(id: number) {
  await requireAdmin();
  const validated = idSchema.parse(id);
  await deleteCategory(validated);
}

export async function reorderCategoriesAction(
  items: { id: number; sort_order: number; parent_id: number | null }[],
) {
  await requireAdmin();
  const validated = z.array(reorderItemSchema).parse(items);
  await reorderCategories(validated);
}
