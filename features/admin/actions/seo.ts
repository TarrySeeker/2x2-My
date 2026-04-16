"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createRedirect,
  updateRedirect,
  deleteRedirect,
  saveSeoTemplates,
} from "@/features/admin/api/seo";
import { requireAdmin } from "@/features/auth/api";
import {
  redirectSchema,
  seoTemplateSchema,
} from "@/features/admin/schemas/seo";

const idSchema = z.number().int().positive();

export async function createRedirectAction(data: unknown) {
  await requireAdmin();
  const validated = redirectSchema.parse(data);
  const result = await createRedirect(validated);
  revalidatePath("/admin/seo");
  return result;
}

export async function updateRedirectAction(id: number, data: unknown) {
  await requireAdmin();
  const validatedId = idSchema.parse(id);
  const validated = redirectSchema.parse(data);
  await updateRedirect(validatedId, validated);
  revalidatePath("/admin/seo");
}

export async function deleteRedirectAction(id: number) {
  await requireAdmin();
  const validated = idSchema.parse(id);
  await deleteRedirect(validated);
  revalidatePath("/admin/seo");
}

export async function saveSeoTemplatesAction(data: unknown) {
  await requireAdmin();
  const validated = seoTemplateSchema.parse(data);
  await saveSeoTemplates(validated);
  revalidatePath("/admin/seo");
}
