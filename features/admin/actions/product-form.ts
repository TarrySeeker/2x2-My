"use server";

import {
  getProductById,
  createProduct,
  updateProduct,
} from "@/features/admin/api/products";
import type { ProductFormData } from "@/features/admin/schemas/product";

export async function getProductByIdAction(id: number) {
  return getProductById(id);
}

export async function createProductAction(data: ProductFormData) {
  return createProduct(data);
}

export async function updateProductAction(id: number, data: ProductFormData) {
  await updateProduct(id, data);
}
