import { z } from "zod";
import { safeUrlNullable } from "./_shared";

/**
 * Схема для таблицы `services` (карточки услуг на витрине).
 *
 * Все URL-поля (`cover_image`, `href`) проходят через `safeUrlNullable` —
 * whitelist схем (`https://`, `/`, `mailto:`, `tel:`, `#`, спец-маркеры
 * `quote_modal`/`oneclick_modal`). Защита от stored-XSS через CMS.
 *
 * `slug` — kebab-case, латиница (для генерации URL). Уникальность гарантирует
 * БД (UNIQUE), здесь — только формат.
 *
 * `features` — массив строк, передаётся клиентом и хранится в jsonb.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const serviceSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug обязателен")
    .max(100, "Slug слишком длинный")
    .regex(
      SLUG_PATTERN,
      "Slug должен быть в kebab-case: латиница, цифры, дефис",
    ),
  title: z
    .string()
    .min(1, "Название обязательно")
    .max(200, "Название слишком длинное")
    .transform((v) => v.trim()),
  short_description: z
    .string()
    .max(500, "Описание не должно быть длиннее 500 символов")
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null)),
  long_description: z
    .string()
    .max(5000, "Длинное описание не должно превышать 5000 символов")
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null)),
  price_from: z
    .number({ invalid_type_error: "Цена должна быть числом" })
    .nonnegative("Цена не может быть отрицательной")
    .max(100_000_000, "Слишком большая цена")
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  price_unit: z
    .string()
    .max(50, "Единица слишком длинная")
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null)),
  price_label: z
    .string()
    .max(100, "Метка слишком длинная")
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null)),
  icon: z
    .string()
    .max(50, "Имя иконки слишком длинное")
    .regex(
      /^[a-z0-9-]*$/i,
      "Имя иконки должно быть kebab-case (как в lucide-react)",
    )
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null)),
  cover_image: safeUrlNullable,
  category: z
    .string()
    .max(50, "Категория слишком длинная")
    .regex(
      /^[a-z0-9_-]*$/,
      "Категория — латиница, цифры, дефис/подчёркивание",
    )
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null)),
  href: safeUrlNullable,
  enabled: z.boolean().default(true),
  display_order: z
    .number()
    .int()
    .nonnegative()
    .max(99_999)
    .default(0),
  features: z
    .array(z.string().min(1).max(200))
    .max(20, "Слишком много пунктов")
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  seo_title: z
    .string()
    .max(200, "SEO title слишком длинный")
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null)),
  seo_description: z
    .string()
    .max(400, "SEO description слишком длинный")
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() || null : null)),
});

export const reorderServicesSchema = z.object({
  ids: z
    .array(z.string().uuid("Некорректный ID"))
    .min(1, "Список не может быть пустым")
    .max(200, "Слишком много элементов"),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;
export type ReorderServicesData = z.infer<typeof reorderServicesSchema>;
