"use server";

import { z } from "zod";
import {
  getProductById,
  createProduct,
  updateProduct,
} from "@/features/admin/api/products";
import { requireAdmin } from "@/features/auth/api";
import { productSchema } from "@/features/admin/schemas/product";
import { logAdminAction } from "@/lib/audit";

const idSchema = z.number().int().positive();

export async function getProductByIdAction(id: number) {
  await requireAdmin();
  const validated = idSchema.parse(id);
  return getProductById(validated);
}

export async function createProductAction(data: unknown) {
  const profile = await requireAdmin();
  const validated = productSchema.parse(data);
  const result = await createProduct(validated);
  await logAdminAction(
    profile.id,
    "products.create",
    "products",
    (result as { id?: number | string } | null)?.id ?? null,
    { slug: validated.slug, name: validated.name, status: validated.status },
  );
  return result;
}

export async function updateProductAction(id: number, data: unknown) {
  const profile = await requireAdmin();
  const validatedId = idSchema.parse(id);
  const validated = productSchema.parse(data);
  await updateProduct(validatedId, validated);
  await logAdminAction(
    profile.id,
    "products.update",
    "products",
    validatedId,
    { slug: validated.slug, name: validated.name, status: validated.status },
  );
}
