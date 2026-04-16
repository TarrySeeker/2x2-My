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

const idSchema = z.number().int().positive();
const idsSchema = z.array(idSchema).min(1);

export async function createMenuItemAction(data: unknown) {
  await requireAdmin();
  const validated = menuItemSchema.parse(data);
  await createMenuItem(validated);
  revalidatePath("/admin/content/menu");
}

export async function updateMenuItemAction(id: number, data: unknown) {
  await requireAdmin();
  const validatedId = idSchema.parse(id);
  const validated = menuItemSchema.parse(data);
  await updateMenuItem(validatedId, validated);
  revalidatePath("/admin/content/menu");
}

export async function deleteMenuItemAction(id: number) {
  await requireAdmin();
  const validated = idSchema.parse(id);
  await deleteMenuItem(validated);
  revalidatePath("/admin/content/menu");
}

export async function reorderMenuItemsAction(position: string, ids: unknown) {
  await requireAdmin();
  const validatedPosition = z.enum(["header", "footer"]).parse(position);
  const validatedIds = idsSchema.parse(ids);
  await reorderMenuItems(validatedPosition, validatedIds);
  revalidatePath("/admin/content/menu");
}
