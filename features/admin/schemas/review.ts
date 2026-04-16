import { z } from "zod";

const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;

export const reviewReplySchema = z.object({
  id: z.number().int().positive(),
  reply: z.string().min(1, "Ответ не может быть пустым").max(2000),
});

export const reviewFilterSchema = z.object({
  status: z.enum(REVIEW_STATUSES).optional(),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().max(100).default(20),
});

export const bulkApproveSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, "Выберите хотя бы один отзыв"),
});

export const reviewIdSchema = z.object({
  id: z.number().int().positive(),
});

export type ReviewReplyData = z.infer<typeof reviewReplySchema>;
export type ReviewFilters = z.infer<typeof reviewFilterSchema>;
export type BulkApproveData = z.infer<typeof bulkApproveSchema>;
