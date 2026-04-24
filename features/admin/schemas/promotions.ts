import { z } from "zod";
import { safeUrlNullable } from "./_shared";

/**
 * Схемы для CMS-таблицы `promotions` (миграция 006).
 *
 * НЕ путать с `promo.ts` — там схемы для `promo_codes`
 * (промокоды для скидок).
 *
 * Поля `image_url` и `link_url` валидируются через `safeUrlNullable` —
 * whitelist схем, защита от stored-XSS (P2-фикс security-аудита 2026-04-23).
 */

const optionalDateString = z
  .string()
  .max(40)
  .nullable()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v : null));

const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null));

export const promotionSchema = z.object({
  title: z.string().min(1, "Заголовок обязателен").max(300),
  body: z.string().min(1, "Описание обязательно").max(5000),
  image_url: safeUrlNullable,
  link_url: safeUrlNullable,
  link_text: optionalText(120),
  valid_from: optionalDateString,
  valid_to: optionalDateString,
  is_active: z.boolean().default(true),
  show_as_popup: z.boolean().default(false),
  sort_order: z.number().int().nonnegative().default(0),
});

export const togglePromotionPopupSchema = z.object({
  show_as_popup: z.boolean(),
});

export type PromotionFormData = z.infer<typeof promotionSchema>;
export type TogglePromotionPopupData = z.infer<
  typeof togglePromotionPopupSchema
>;
