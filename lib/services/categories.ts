/**
 * Фиксированный список категорий услуг.
 *
 * Используется в:
 *  - админке (`features/admin/components/ServicesPageClient.tsx`) — выпадающий
 *    список вместо текстового input'а, чтобы клиент не мог вписать кириллицу
 *    или произвольные строки (Zod-схема всё равно ругалась бы на кириллицу).
 *  - на витрине (`components/sections/services/ServicesCards.tsx`) — для
 *    группировки карточек услуг по категориям с человекочитаемыми
 *    заголовками.
 *
 * value (slug) пишется в БД (`services.category`) и проверяется Zod-схемой
 * `^[a-z0-9_-]*$`. label рендерится в UI.
 *
 * При добавлении новой категории: добавь сюда → перезапусти миграцию seed
 * (если нужно) → клиенты увидят новый пункт в админке.
 */

export const SERVICE_CATEGORIES = [
  { value: "polygraphy", label: "Полиграфия" },
  { value: "outdoor", label: "Наружная реклама" },
  { value: "facade", label: "Фасады и оформление" },
  { value: "design", label: "Дизайн" },
  { value: "installation", label: "Монтаж" },
] as const;

export type ServiceCategoryValue =
  (typeof SERVICE_CATEGORIES)[number]["value"];

/**
 * Преобразует машинный slug категории в русский label.
 * Если slug не из списка (или null) — возвращает сам slug или fallback.
 */
export function getServiceCategoryLabel(
  value: string | null | undefined,
  fallback = "Прочее",
): string {
  if (!value) return fallback;
  const found = SERVICE_CATEGORIES.find((c) => c.value === value);
  return found ? found.label : value;
}
