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
import { logAdminAction } from "@/lib/audit";

// BIGSERIAL id → строка в RSC payload. coerce принимает оба варианта.
const idSchema = z.coerce.number().int().positive();
const idsSchema = z.array(idSchema).min(1);
const statusSchema = z.enum(["active", "draft", "archived"]);

export async function fetchProductsAction(filters: AdminProductFilters) {
  await requireAdmin();
  return getAdminProducts(filters);
}

export async function deleteProductAction(id: number) {
  const profile = await requireAdmin();
  const validated = idSchema.parse(id);
  await deleteProduct(validated);
  await logAdminAction(
    profile.id,
    "products.delete",
    "products",
    validated,
    null,
  );
}

export async function duplicateProductAction(id: number) {
  const profile = await requireAdmin();
  const validated = idSchema.parse(id);
  const result = await duplicateProduct(validated);
  await logAdminAction(
    profile.id,
    "products.duplicate",
    "products",
    (result as { id?: number | string } | null)?.id ?? null,
    { source_id: validated },
  );
  return result;
}

export async function bulkUpdateStatusAction(
  ids: number[],
  status: string,
) {
  const profile = await requireAdmin();
  const validatedIds = idsSchema.parse(ids);
  const validatedStatus = statusSchema.parse(status);
  await bulkUpdateStatus(validatedIds, validatedStatus);
  await logAdminAction(
    profile.id,
    "products.bulk_update_status",
    "products",
    null,
    { count: validatedIds.length, ids: validatedIds, status: validatedStatus },
  );
}

export async function bulkDeleteAction(ids: number[]) {
  const profile = await requireAdmin();
  const validatedIds = idsSchema.parse(ids);
  await bulkDelete(validatedIds);
  await logAdminAction(
    profile.id,
    "products.bulk_delete",
    "products",
    null,
    { count: validatedIds.length, ids: validatedIds },
  );
}
