"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createPage,
  updatePage,
  deletePage,
} from "@/features/admin/api/pages";
import { requireAuth } from "@/features/auth/api";
import { pageSchema } from "@/features/admin/schemas/page";
import { sanitizeHtml } from "@/lib/sanitize/html";
import { logAdminAction } from "@/lib/audit";

// BIGSERIAL id → строка в RSC payload. coerce принимает оба варианта.
const idSchema = z.coerce.number().int().positive();

/** Pages are available to content role too */
async function requireContentAccess() {
  const profile = await requireAuth();
  if (!["owner", "manager", "content"].includes(profile.role)) {
    throw new Error("Недостаточно прав");
  }
  return profile;
}

export async function createPageAction(data: unknown) {
  const profile = await requireContentAccess();
  const validated = pageSchema.parse(data);
  // TipTap-контент санитизируем перед сохранением — защита от XSS.
  validated.content = sanitizeHtml(validated.content);
  const result = await createPage(validated);
  revalidatePath("/admin/content/pages");
  await logAdminAction(
    profile.id,
    "pages.create",
    "pages",
    (result as { id?: number | string } | null)?.id ?? null,
    { slug: validated.slug, title: validated.title },
  );
  return result;
}

export async function updatePageAction(id: number, data: unknown) {
  const profile = await requireContentAccess();
  const validatedId = idSchema.parse(id);
  const validated = pageSchema.parse(data);
  validated.content = sanitizeHtml(validated.content);
  await updatePage(validatedId, validated);
  revalidatePath("/admin/content/pages");
  await logAdminAction(
    profile.id,
    "pages.update",
    "pages",
    validatedId,
    { slug: validated.slug, title: validated.title },
  );
}

export async function deletePageAction(id: number) {
  const profile = await requireContentAccess();
  const validated = idSchema.parse(id);
  await deletePage(validated);
  revalidatePath("/admin/content/pages");
  await logAdminAction(
    profile.id,
    "pages.delete",
    "pages",
    validated,
    null,
  );
}
