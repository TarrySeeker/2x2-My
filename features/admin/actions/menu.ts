"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenuItems,
} from "@/features/admin/api/menu";
import { requireResource } from "@/features/auth/api";
import { menuItemSchema } from "@/features/admin/schemas/menu";
import { logAdminAction } from "@/lib/audit";

// BIGSERIAL id → строка в RSC payload. coerce принимает оба варианта.
const idSchema = z.coerce.number().int().positive();
const idsSchema = z.array(idSchema).min(1);

export async function createMenuItemAction(data: unknown) {
  const profile = await requireResource("content.cms");
  const validated = menuItemSchema.parse(data);
  await createMenuItem(validated);
  revalidatePath("/admin/content/menu");
  await logAdminAction(
    profile.id,
    "menu.create",
    "menu_items",
    null,
    validated,
  );
}

export async function updateMenuItemAction(id: number, data: unknown) {
  const profile = await requireResource("content.cms");
  const validatedId = idSchema.parse(id);
  const validated = menuItemSchema.parse(data);
  await updateMenuItem(validatedId, validated);
  revalidatePath("/admin/content/menu");
  await logAdminAction(
    profile.id,
    "menu.update",
    "menu_items",
    validatedId,
    validated,
  );
}

export async function deleteMenuItemAction(id: number) {
  const profile = await requireResource("content.cms");
  const validated = idSchema.parse(id);
  await deleteMenuItem(validated);
  revalidatePath("/admin/content/menu");
  await logAdminAction(
    profile.id,
    "menu.delete",
    "menu_items",
    validated,
    null,
  );
}

export async function reorderMenuItemsAction(position: string, ids: unknown) {
  const profile = await requireResource("content.cms");
  const validatedPosition = z.enum(["header", "footer"]).parse(position);
  const validatedIds = idsSchema.parse(ids);
  await reorderMenuItems(validatedPosition, validatedIds);
  revalidatePath("/admin/content/menu");
  await logAdminAction(
    profile.id,
    "menu.reorder",
    "menu_items",
    null,
    { position: validatedPosition, count: validatedIds.length },
  );
}
