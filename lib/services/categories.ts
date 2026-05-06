/**
 * Категории услуг.
 *
 * Архитектура (после миграции 029_service_categories.sql):
 *  - Источник истины — таблица `service_categories` (CRUD через
 *    /admin/content/services-categories).
 *  - Этот файл оставлен как FALLBACK на случай недоступной БД и для
 *    утилитарных функций, которые работают со slug'ом без обращения к БД
 *    (например, label-резолвер на client-side).
 *  - Slug в `service_categories.slug` совпадает со значением, которое
 *    лежит в `services.category` (без FK — слабая связь).
 *
 * Где используется DB-список (читать на сервере):
 *  - features/admin/api/service-categories.ts
 *    (`listAllServiceCategoriesForAdmin`, `listPublishedServiceCategories`)
 *  - В UI (RSC) — импортируйте оттуда, не из этого файла.
 *
 * Где используется этот файл:
 *  - lib/data/services.ts: fallback на пустой БД
 *  - components/sections/services/ServicesCards.tsx: client-side
 *    label-резолвер (мы передаём в client уже-резолв-ленные lazy
 *    группы, а не словарь)
 *  - features/admin/components/ServicesPageClient.tsx: list of options
 *    в форме услуги — заменяется в следующем этапе на пропс с
 *    данными из БД
 *
 * При добавлении новой категории через админку:
 *   - в БД появляется новая строка
 *   - getServiceCategoryLabel() в этом файле НЕ узнает её (вернёт сам
 *     slug). Это намеренно — на client-only-страницах label лучше
 *     передавать готовым из RSC, а не резолвить через словарь, иначе
 *     добавленные через админку категории не отобразятся.
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
 * Если slug не из захардкоженного списка (или null) — возвращает сам
 * slug или fallback. Для категорий, добавленных через админку,
 * предпочтительнее использовать `ServiceCategory.label` из БД напрямую.
 */
export function getServiceCategoryLabel(
  value: string | null | undefined,
  fallback = "Прочее",
): string {
  if (!value) return fallback;
  const found = SERVICE_CATEGORIES.find((c) => c.value === value);
  return found ? found.label : value;
}
