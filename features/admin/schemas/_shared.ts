import { z } from "zod";

/**
 * Общие helpers для Zod-схем CMS/админки.
 *
 * — `safeUrl` — строка-URL с whitelist схем (защита от javascript:/data:
 *   XSS, описана в P2-фиксах security-аудита 2026-04-23).
 *
 * Любые URL-поля, которые потом превращаются в `<a href={...}>` или
 * `<img src={...}>`, ОБЯЗАНЫ проходить через `safeUrl` (или его обёртку).
 */

/**
 * Allow-list URL-схем. Принимаем:
 *  - `https://...` и `http://...` — внешние ссылки;
 *  - `/...` — relative-ссылки внутри сайта (включая `/2x2-media/...` для MinIO);
 *  - `#hash` — якоря в текущей странице;
 *  - `mailto:...`, `tel:...` — кликабельные контакты;
 *  - спец-маркеры `quote_modal` / `oneclick_modal` — обрабатываются клиентом
 *    (CtaSection / HeroSectionClient) для открытия модалок вместо перехода.
 *  - пустую строку / `null` / `undefined` — поле опциональное.
 *
 * Запрещаем `javascript:`, `data:`, `vbscript:`, `file:` и любые иные схемы —
 * это закрывает stored-XSS через CMS.
 */
const URL_PATTERN = /^(https?:\/\/|\/(?!\/)|#|mailto:|tel:)/i;
const SPECIAL_MARKERS = new Set(["quote_modal", "oneclick_modal"]);

function isSafeUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  if (SPECIAL_MARKERS.has(trimmed)) return true;
  return URL_PATTERN.test(trimmed);
}

const URL_ERROR_MESSAGE =
  "URL должен начинаться с https://, http://, / (внутренний путь), # (якорь), mailto: или tel: либо быть спец-маркером quote_modal/oneclick_modal";

/**
 * Опциональный URL с whitelist-валидацией схемы.
 *
 * После парсинга:
 *  - валидное значение → trimmed string;
 *  - пустое / nullable → `""` (для совместимости с CMS-формами,
 *    где пустая строка эквивалентна «поле не задано»).
 */
export const safeUrl = z
  .string()
  .max(2000)
  .optional()
  .nullable()
  .refine(isSafeUrl, { message: URL_ERROR_MESSAGE })
  .transform((v) => (v ? v.trim() : ""));

/**
 * Вариант safeUrl для схем, которым нужно сохранять `null` (а не `""`)
 * для пустых значений — например, таблицы с nullable-колонками
 * (`promotions.link_url`, `team.photo_url`).
 */
export const safeUrlNullable = z
  .string()
  .max(2000)
  .nullable()
  .optional()
  .refine(isSafeUrl, { message: URL_ERROR_MESSAGE })
  .transform((v) => (v ? v.trim() || null : null));
