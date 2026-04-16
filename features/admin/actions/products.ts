"use server";

import { z } from "zod";
import {
  getAdminProducts,
  deleteProduct,
  duplicateProduct,
  bulkUpdateStatus,
  bulkDelete,
} from "@/features/admin/api/products";
import { requireAdmin } from "@/features/auth/api";
import type { AdminProductFilters } from "@/features/admin/types";

const idSchema = z.number().int().positive();
const idsSchema = z.array(idSchema).min(1);
const statusSchema = z.enum(["active", "draft", "archived"]);

export async function fetchProductsAction(filters: AdminProductFilters) {
  await requireAdmin();
  return getAdminProducts(filters);
}

export async function deleteProductAction(id: number) {
  await requireAdmin();
  const validated = idSchema.parse(id);
  await deleteProduct(validated);
}

export async function duplicateProductAction(id: number) {
  await requireAdmin();
  const validated = idSchema.parse(id);
  return duplicateProduct(validated);
}

export async function bulkUpdateStatusAction(
  ids: number[],
  status: string,
) {
  await requireAdmin();
  const validatedIds = idsSchema.parse(ids);
  const validatedStatus = statusSchema.parse(status);
  await bulkUpdateStatus(validatedIds, validatedStatus);
}

export async function bulkDeleteAction(ids: number[]) {
  await requireAdmin();
  const validatedIds = idsSchema.parse(ids);
  await bulkDelete(validatedIds);
}
