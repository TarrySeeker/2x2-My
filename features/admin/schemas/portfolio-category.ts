import { z } from "zod";

/**
 * Zod-схема для CRUD категорий портфолио (`portfolio_categories`).
 *
 * Маппится 1:1 на таблицу из db/migrations/031_portfolio_categories.sql.
 *
 * Поля `id`, `created_at`, `updated_at` — управляются БД и не приходят
 * из формы.
 *
 * Особенность портфолио (в отличие от services): связь "категория ↔
 * работа" идёт по `label` (русская строка), а не по slug. Slug всё
 * равно валидируется и сохраняется (для устойчивости — например, чтобы
 * можно было переименовать label без потери привязки услуг к категории
 * через хук в server action).
 */

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug обязателен")
  .max(60, "Slug не длиннее 60 символов")
  .regex(
    /^[a-z0-9_-]+$/,
    "Только латиница в нижнем регистре, цифры, дефисы и подчёркивания",
  );

export const portfolioCategorySchema = z.object({
  slug: slugSchema,
  label: z.string().trim().min(1, "Название обязательно").max(120),
  description: z
    .string()
    .max(1000)
    .nullable()
    .optional()
    .transform((v) => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim();
      return trimmed.length > 0 ? trimmed : null;
    }),
  sort_order: z.coerce.number().int().min(0).max(10_000).default(0),
  is_published: z.boolean().default(true),
});

export type PortfolioCategoryFormData = z.infer<
  typeof portfolioCategorySchema
>;

/**
 * Схема для batch-переупорядочивания.
 * Принимает массив { id, sort_order } — порядок применяется как есть.
 *
 * id через `coerce.number()` — BIGSERIAL сериализуется в RSC payload как
 * строка (LESSONS_LEARNED Категория 2).
 */
export const portfolioCategoryReorderSchema = z
  .array(
    z.object({
      id: z.coerce.number().int().positive(),
      sort_order: z.coerce.number().int().min(0).max(10_000),
    }),
  )
  .min(1)
  .max(500);

export type PortfolioCategoryReorderInput = z.infer<
  typeof portfolioCategoryReorderSchema
>;
