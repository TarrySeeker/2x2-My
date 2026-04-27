import { z } from "zod";
import { safeUrl } from "./_shared";

/**
 * Zod-схема для таблицы `page_metadata` (миграция 009).
 *
 * Используется:
 *   - в server action updatePageMetadataAction (admin save)
 *   - в data-layer lib/data/page-metadata.ts при upsert
 *
 * Поля:
 *   path       — относительный URL страницы. Уникален, служит ключом
 *                upsert-а. Должен начинаться с `/`.
 *   title      — `<title>` тег. Опционально (если пусто — fallback на
 *                buildMetadata default).
 *   description — meta description.
 *   keywords   — массив ключевых слов. В админке chip-input.
 *   og_image   — path (`/og-image.jpg`) или full URL. Защита от
 *                javascript:/data: через safeUrl.
 *   noindex    — если true, страница получает robots: noindex, follow.
 *   canonical  — опциональный абсолютный URL; если задан — отменяет
 *                автоматический absoluteUrl(path).
 */
export const pageMetadataSchema = z.object({
  path: z
    .string()
    .min(1)
    .max(500)
    .regex(/^\/[\w/%\-.]*$/, {
      message:
        "Путь должен начинаться с / и содержать только безопасные символы URL",
    }),
  title:       z.string().max(200).nullable().optional().transform((v) => (v ? v.trim() : null)),
  description: z.string().max(500).nullable().optional().transform((v) => (v ? v.trim() : null)),
  keywords:    z.array(z.string().min(1).max(100)).max(40).default([]),
  /**
   * safeUrl возвращает string ("" для пустых). Трансформируем `""` в `null`
   * отдельной стадией — схема db допускает NULL, это семантически чище.
   */
  og_image:    safeUrl.transform((v) => (v ? v : null)),
  noindex:     z.boolean().default(false),
  canonical:   safeUrl.transform((v) => (v ? v : null)),
});

/**
 * Тип из Zod-схемы — удобно импортировать в компоненты формы.
 */
export type PageMetadataInput = z.infer<typeof pageMetadataSchema>;

/**
 * Разрешённые пути — защита от произвольного добавления.
 *
 * Если в будущем появятся новые страницы — сначала добавить сюда,
 * потом применять миграцию с seed'ом. Пустой список = без ограничений
 * (некоторые проекты так и делают; здесь белый список строже).
 */
export const PAGE_METADATA_ALLOWED_PATHS: readonly string[] = [
  "/",
  "/about",
  "/services",
  "/portfolio",
  "/contacts",
  "/faq",
  "/blog",
  "/privacy",
  "/terms",
  "/offer",
] as const;

export function isAllowedPageMetadataPath(path: string): boolean {
  return PAGE_METADATA_ALLOWED_PATHS.includes(path);
}
