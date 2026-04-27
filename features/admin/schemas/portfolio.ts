import { z } from "zod";

/**
 * Zod-схема для полного CRUD портфолио в админке.
 *
 * Маппится 1:1 на таблицу `portfolio_items`
 * (см. db/migrations/002_schema.sql + 006_cms_and_security.sql).
 *
 * Поля `id`, `created_at`, `updated_at`, `search_vector`, `views_count`,
 * `is_featured`, `featured_order` — управляются отдельно
 * (см. setFeaturedPortfolioAction для блока «3 главные работы»).
 */

const slugSchema = z
  .string()
  .trim()
  .min(1, "Slug обязателен")
  .max(120, "Slug не длиннее 120 символов")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Только латиница в нижнем регистре, цифры и дефисы (kebab-case)",
  );

const urlOrPathSchema = z
  .string()
  .trim()
  .min(1, "Изображение обязательно")
  .max(2048);

export const portfolioItemSchema = z.object({
  title: z.string().trim().min(1, "Название обязательно").max(200),
  slug: slugSchema,
  description: z.string().max(10_000).nullable().default(null),
  short_description: z.string().max(500).nullable().default(null),

  category_id: z
    .number()
    .int()
    .positive()
    .nullable()
    .default(null),
  // Из админки приходит value <select>: либо строка из
  // PORTFOLIO_CATEGORIES, либо "" (опция «— не задана —»), либо
  // legacy-значение (старое произвольное name из БД, см. legacy-блок
  // в PortfolioPageClient). Пустую строку приводим к null, чтобы
  // не плодить лишние пустяки в БД и чтобы фильтр по != ''
  // в коде витрины работал предсказуемо.
  category_label: z
    .string()
    .max(120)
    .nullable()
    .default(null)
    .transform((v) => {
      if (typeof v !== "string") return null;
      const trimmed = v.trim();
      return trimmed.length > 0 ? trimmed : null;
    }),
  related_product_id: z
    .number()
    .int()
    .positive()
    .nullable()
    .default(null),

  client_name: z.string().max(120).nullable().default(null),
  industry: z.string().max(120).nullable().default(null),
  location: z.string().max(120).nullable().default(null),
  year: z
    .number()
    .int()
    .min(1990)
    .max(2100)
    .nullable()
    .default(null),
  // ISO date (YYYY-MM-DD) или null
  project_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Дата формата YYYY-MM-DD")
    .nullable()
    .default(null),

  cover_url: urlOrPathSchema,
  images: z.array(z.string().min(1).max(2048)).max(50).default([]),
  video_url: z.string().max(2048).nullable().default(null),

  is_published: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(10_000).default(0),

  seo_title: z.string().max(200).nullable().default(null),
  seo_description: z.string().max(500).nullable().default(null),
  // ISO timestamp; UI пишет 'YYYY-MM-DDTHH:mm', Node парсит — оставим строку.
  published_at: z.string().nullable().default(null),
});

export type PortfolioFormData = z.infer<typeof portfolioItemSchema>;

/**
 * Схема для batch-переупорядочивания.
 * Принимает массив { id, sort_order } — порядок применяется как есть.
 */
export const portfolioReorderSchema = z
  .array(
    z.object({
      id: z.number().int().positive(),
      sort_order: z.number().int().min(0).max(10_000),
    }),
  )
  .min(1)
  .max(500);

export type PortfolioReorderInput = z.infer<typeof portfolioReorderSchema>;
