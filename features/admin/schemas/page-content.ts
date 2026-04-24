import { z } from "zod";

/**
 * Zod-схема для таблицы `page_content` (миграция 013).
 *
 * Используется для длинных текстовых страниц: /privacy, /terms, /offer.
 * Поле content_markdown — markdown с плейсхолдерами вида {legal_name},
 * {inn}, {phone}, {email}. Плейсхолдеры подставляются рантайм-функцией
 * renderPageContent() из data-layer'а.
 *
 * Разрешённые пути — белый список (ниже).
 */

export const PAGE_CONTENT_ALLOWED_PATHS: readonly string[] = [
  "/privacy",
  "/terms",
  "/offer",
] as const;

export function isAllowedPageContentPath(path: string): boolean {
  return (PAGE_CONTENT_ALLOWED_PATHS as readonly string[]).includes(path);
}

export const pageContentSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(500)
    .refine(isAllowedPageContentPath, {
      message: `path должен быть одним из: ${PAGE_CONTENT_ALLOWED_PATHS.join(", ")}`,
    }),
  title:            z.string().min(1).max(300),
  content_markdown: z.string().min(1).max(200000),
  published:        z.boolean().default(true),
});

export type PageContentInput = z.infer<typeof pageContentSchema>;

/**
 * Допустимые плейсхолдеры в content_markdown.
 * Значения подставляются из:
 *   - site_settings.legal_entity (legal_name, inn, ogrn, legal_address, actual_address)
 *   - site_settings.contacts     (phone, email)
 *   - site_settings.pd_consent   (policy_version)
 *
 * policy_date — вычисляется рантаймом из pd_consent.current_version
 * (формат YYYY-MM-DD → "23 апреля 2026 г.").
 */
export const PAGE_CONTENT_PLACEHOLDERS = [
  "legal_name",
  "inn",
  "ogrn",
  "legal_address",
  "actual_address",
  "phone",
  "email",
  "policy_version",
  "policy_date",
] as const;

export type PageContentPlaceholder = (typeof PAGE_CONTENT_PLACEHOLDERS)[number];
