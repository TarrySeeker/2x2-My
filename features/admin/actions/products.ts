"use server";

import {
  getAdminProducts,
  deleteProduct,
  duplicateProduct,
  bulkUpdateStatus,
  bulkDelete,
} from "@/features/admin/api/products";
import type { AdminProductFilters } from "@/features/admin/types";
import type { ProductStatus } from "@/types/database";

export async function fetchProductsAction(filters: AdminProductFilters) {
  return getAdminProducts(filters);
}

export async function deleteProductAction(id: number) {
  await deleteProduct(id);
}

export async function duplicateProductAction(id: number) {
  return duplicateProduct(id);
}

export async function bulkUpdateStatusAction(
  ids: number[],
  status: ProductStatus,
) {
  await bulkUpdateStatus(ids, status);
}

export async function bulkDeleteAction(ids: number[]) {
  await bulkDelete(ids);
}
