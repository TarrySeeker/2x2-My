"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderMenuItems,
} from "@/features/admin/api/menu";
import { requireAdmin } from "@/features/auth/api";
import { menuItemSchema } from "@/features/admin/schemas/menu";
import { logAdminAction } from "@/lib/audit";

const idSchema = z.number().int().positive();
const idsSchema = z.array(idSchema).min(1);

export async function createMenuItemAction(data: unknown) {
  const profile = await requireAdmin();
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
  const profile = await requireAdmin();
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
  const profile = await requireAdmin();
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
  const profile = await requireAdmin();
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
