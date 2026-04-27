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
import { logAdminAction } from "@/lib/audit";

// BIGSERIAL id → строка в RSC payload. coerce принимает оба варианта.
const idSchema = z.coerce.number().int().positive();

export async function createRedirectAction(data: unknown) {
  const profile = await requireAdmin();
  const validated = redirectSchema.parse(data);
  const result = await createRedirect(validated);
  revalidatePath("/admin/seo");
  await logAdminAction(
    profile.id,
    "seo.redirect.create",
    "redirects",
    (result as { id?: number | string } | null)?.id ?? null,
    validated,
  );
  return result;
}

export async function updateRedirectAction(id: number, data: unknown) {
  const profile = await requireAdmin();
  const validatedId = idSchema.parse(id);
  const validated = redirectSchema.parse(data);
  await updateRedirect(validatedId, validated);
  revalidatePath("/admin/seo");
  await logAdminAction(
    profile.id,
    "seo.redirect.update",
    "redirects",
    validatedId,
    validated,
  );
}

export async function deleteRedirectAction(id: number) {
  const profile = await requireAdmin();
  const validated = idSchema.parse(id);
  await deleteRedirect(validated);
  revalidatePath("/admin/seo");
  await logAdminAction(
    profile.id,
    "seo.redirect.delete",
    "redirects",
    validated,
    null,
  );
}

export async function saveSeoTemplatesAction(data: unknown) {
  const profile = await requireAdmin();
  const validated = seoTemplateSchema.parse(data);
  await saveSeoTemplates(validated);
  revalidatePath("/admin/seo");
  await logAdminAction(
    profile.id,
    "seo.templates.save",
    "seo_templates",
    null,
    validated,
  );
}
