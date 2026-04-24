import { z } from "zod";
import { safeUrlNullable } from "./_shared";

/**
 * Схема для таблицы `team` (сотрудники компании).
 *
 * `photo_url` валидируется через `safeUrlNullable` — whitelist:
 *   `https://...`, относительные `/...` (загрузки в MinIO `/2x2-media/...`),
 *   `mailto:`, `tel:`. Запрещены `javascript:`, `data:` и иные схемы —
 *   защита от stored-XSS (P2-фикс security-аудита 2026-04-23).
 */
export const teamMemberSchema = z.object({
  name: z.string().min(1, "Имя обязательно").max(200),
  role: z.string().min(1, "Должность обязательна").max(200),
  photo_url: safeUrlNullable,
  bio: z
    .string()
    .max(2000)
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null)),
  sort_order: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true),
});

export const reorderTeamSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(100),
});

export type TeamMemberFormData = z.infer<typeof teamMemberSchema>;
export type ReorderTeamData = z.infer<typeof reorderTeamSchema>;
