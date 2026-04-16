"use server";

import { z } from "zod";
import {
  getProductById,
  createProduct,
  updateProduct,
} from "@/features/admin/api/products";
import { requireAdmin } from "@/features/auth/api";
import { productSchema } from "@/features/admin/schemas/product";

const idSchema = z.number().int().positive();

export async function getProductByIdAction(id: number) {
  await requireAdmin();
  const validated = idSchema.parse(id);
  return getProductById(validated);
}

export async function createProductAction(data: unknown) {
  await requireAdmin();
  const validated = productSchema.parse(data);
  return createProduct(validated);
}

export async function updateProductAction(id: number, data: unknown) {
  await requireAdmin();
  const validatedId = idSchema.parse(id);
  const validated = productSchema.parse(data);
  await updateProduct(validatedId, validated);
}
