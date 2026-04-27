/**
 * Фиксированный список категорий портфолио.
 *
 * ВАЖНО — отличие от lib/services/categories.ts:
 *   В services value — английский slug (`polygraphy` и т.п.), который
 *   проверяется Zod-схемой `^[a-z0-9_-]*$` и не показывается клиенту.
 *   В portfolio value === label (русские строки), потому что фильтр на
 *   витрине (`components/sections/portfolio/PortfolioGallery.tsx`)
 *   сравнивает `work.category` строкой строго с одной из этих надписей.
 *   Не пытайся унифицировать — это два разных контекста.
 *
 * Используется в:
 *  - админке (`features/admin/components/PortfolioPageClient.tsx`) —
 *    выпадающий список вместо текстового input'а, чтобы клиент не мог
 *    вписать опечатку или произвольную категорию (иначе карточка
 *    «выпадает» из любого фильтра).
 *  - на витрине (`components/sections/portfolio/PortfolioGallery.tsx`) —
 *    единый источник истины для кнопок-фильтров «Все / Полиграфия / …».
 *
 * При добавлении новой категории: добавь сюда → клиент увидит её и в
 * админке (select), и на витрине (фильтр).
 */

export const PORTFOLIO_CATEGORIES = [
  { value: "Полиграфия", label: "Полиграфия" },
  { value: "Наружная реклама", label: "Наружная реклама" },
  { value: "Фасады", label: "Фасады" },
] as const;

export type PortfolioCategoryValue =
  (typeof PORTFOLIO_CATEGORIES)[number]["value"];

/**
 * Список значений для фильтра-кнопок на /portfolio.
 * Первый элемент — спец-значение «Все» (сбрасывает фильтр).
 */
export const PORTFOLIO_FILTER_LIST = [
  "Все",
  ...PORTFOLIO_CATEGORIES.map((c) => c.value),
] as const;

export type PortfolioFilterValue = (typeof PORTFOLIO_FILTER_LIST)[number];

/**
 * Проверяет, входит ли строка в фиксированный список категорий.
 * Полезно в админке для отделения legacy-значений (которые попали в БД
 * до введения select'а) от текущих.
 */
export function isKnownPortfolioCategory(
  value: string | null | undefined,
): value is PortfolioCategoryValue {
  if (!value) return false;
  return PORTFOLIO_CATEGORIES.some((c) => c.value === value);
}
