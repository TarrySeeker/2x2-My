import { z } from "zod";

const ORDER_STATUSES = [
  "new",
  "confirmed",
  "in_production",
  "ready",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
  "returned",
] as const;

export const statusUpdateSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  comment: z.string().max(1000).optional(),
});

export const assignOrderSchema = z.object({
  profile_id: z.string().uuid(),
});

export const managerCommentSchema = z.object({
  comment: z.string().min(1, "Комментарий обязателен").max(2000),
});

export const requisitesSchema = z.object({
  requisites: z.string().max(4000),
});

export type StatusUpdateData = z.infer<typeof statusUpdateSchema>;
export type AssignOrderData = z.infer<typeof assignOrderSchema>;
export type ManagerCommentData = z.infer<typeof managerCommentSchema>;
export type RequisitesData = z.infer<typeof requisitesSchema>;
