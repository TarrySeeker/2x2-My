"use server";

import {
  getCategoriesTree,
  getCategoriesFlat,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "@/features/admin/api/categories";
import type { CategoryFormData } from "@/features/admin/schemas/category";

export async function fetchCategoriesTreeAction() {
  return getCategoriesTree();
}

export async function fetchCategoriesFlatAction() {
  return getCategoriesFlat();
}

export async function createCategoryAction(data: CategoryFormData) {
  return createCategory(data);
}

export async function updateCategoryAction(id: number, data: CategoryFormData) {
  await updateCategory(id, data);
}

export async function deleteCategoryAction(id: number) {
  await deleteCategory(id);
}

export async function reorderCategoriesAction(
  items: { id: number; sort_order: number; parent_id: number | null }[],
) {
  await reorderCategories(items);
}
