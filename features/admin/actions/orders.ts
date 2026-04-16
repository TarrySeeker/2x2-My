"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  getAdminOrders,
  updateOrderStatus,
  assignOrder,
  addManagerComment,
  exportOrdersCSV,
} from "@/features/admin/api/orders";
import { requireAdmin } from "@/features/auth/api";
import {
  statusUpdateSchema,
  assignOrderSchema,
  managerCommentSchema,
} from "@/features/admin/schemas/order";
import type { AdminOrderFilters } from "@/features/admin/types";

const idSchema = z.number().int().positive();

export async function fetchOrdersAction(filters: AdminOrderFilters) {
  await requireAdmin();
  return getAdminOrders(filters);
}

export async function updateOrderStatusAction(
  orderId: number,
  data: unknown,
) {
  const profile = await requireAdmin();
  const validatedId = idSchema.parse(orderId);
  const validated = statusUpdateSchema.parse(data);
  await updateOrderStatus(
    validatedId,
    validated.status,
    validated.comment ?? null,
    profile.id,
  );
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${validatedId}`);
}

export async function assignOrderAction(
  orderId: number,
  data: unknown,
) {
  await requireAdmin();
  const validatedId = idSchema.parse(orderId);
  const validated = assignOrderSchema.parse(data);
  await assignOrder(validatedId, validated.profile_id);
  revalidatePath(`/admin/orders/${validatedId}`);
}

export async function addCommentAction(
  orderId: number,
  data: unknown,
) {
  await requireAdmin();
  const validatedId = idSchema.parse(orderId);
  const validated = managerCommentSchema.parse(data);
  await addManagerComment(validatedId, validated.comment);
  revalidatePath(`/admin/orders/${validatedId}`);
}

export async function exportOrdersAction(
  filters: AdminOrderFilters,
): Promise<string> {
  await requireAdmin();
  return exportOrdersCSV(filters);
}
