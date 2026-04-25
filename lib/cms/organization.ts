import "server-only";

import { getSettingValue } from "@/lib/data/settings";
import { BUSINESS, SITE } from "@/lib/seo/site";

/**
 * Server-helper для чтения `site_settings.organization` с автоматическим
 * fallback на константы из `lib/seo/site.ts`.
 *
 * Источник истины — таблица site_settings. Константы из SITE/BUSINESS
 * оставлены как fallback для:
 *   1) build-time (когда DATABASE_URL = placeholder и БД недоступна),
 *   2) первого запуска до сидинга,
 *   3) случая, если клиент очистил поле в админке.
 *
 * Используй везде, где раньше использовались SITE.slogan, SITE.description,
 * SITE.shortDescription, SITE.name, SITE.shortName, SITE.themeColor,
 * SITE.ogImage. Кеш — внутренний `unstable_cache(60s, tag=settings:organization)`.
 *
 * Тег ревалидируется автоматически из `upsertSetting('organization', ...)`
 * через server action в админке (см. features/admin/actions/site-settings.ts:
 * `revalidateTag('settings:organization')`).
 */

export interface OrganizationSettings {
  /** Полное имя бренда. SITE.name. */
  name: string;
  /** Короткое имя (для footer copyright, twitter creator). SITE.shortName. */
  short_name: string;
  /** Юр. название (используется в JSON-LD Organization.legalName). SITE.legalName. */
  legal_name: string;
  /** Слоган бренда. SITE.slogan. */
  slogan: string;
  /** Длинное описание для метаданных страниц / JSON-LD. SITE.description. */
  description: string;
  /** Короткое описание для twitter card / footer tagline. SITE.shortDescription. */
  short_description: string;
  /** SITE.locale */
  locale: string;
  /** SITE.language */
  language: string;
  /** Hex-цвет theme-color. SITE.themeColor. */
  theme_color: string;
  /** Путь к глобальному og-image. SITE.ogImage. */
  og_image: string;
  /** Год основания. BUSINESS.foundingYear. */
  founding_year: number;
  /** Ценовой диапазон для LocalBusiness. BUSINESS.priceRange. */
  price_range: string;
  /** Города из JSON-LD areaServed. BUSINESS.areaServed. */
  area_served: string[];
  /** Глобальные SEO-keywords. SITE.keywords. */
  keywords_global: string[];
}

/**
 * Сырая структура из БД — все поля опциональны (клиент может удалить
 * любое в админке).
 */
interface RawOrganizationValue {
  name?: string | null;
  short_name?: string | null;
  legal_name?: string | null;
  slogan?: string | null;
  description?: string | null;
  short_description?: string | null;
  locale?: string | null;
  language?: string | null;
  theme_color?: string | null;
  og_image?: string | null;
  founding_year?: number | string | null;
  price_range?: string | null;
  area_served?: unknown;
  keywords_global?: unknown;
}

function trimmedOr<T extends string>(value: unknown, fallback: T): T | string {
  if (typeof value !== "string") return fallback;
  const t = value.trim();
  return t.length > 0 ? t : fallback;
}

function arrayOfStrings(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const arr = value
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return arr.length > 0 ? arr : [...fallback];
}

function intOr(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/**
 * Возвращает «гарантированно заполненный» Organization.
 * Никогда не бросает (любая ошибка чтения БД → fallback).
 */
export async function getOrganization(): Promise<OrganizationSettings> {
  const raw = await getSettingValue<RawOrganizationValue>(
    "organization",
    {} as RawOrganizationValue,
  );

  return {
    name:              trimmedOr(raw?.name, SITE.name),
    short_name:        trimmedOr(raw?.short_name, SITE.shortName),
    legal_name:        trimmedOr(raw?.legal_name, SITE.legalName),
    slogan:            trimmedOr(raw?.slogan, SITE.slogan),
    description:       trimmedOr(raw?.description, SITE.description),
    short_description: trimmedOr(raw?.short_description, SITE.shortDescription),
    locale:            trimmedOr(raw?.locale, SITE.locale),
    language:          trimmedOr(raw?.language, SITE.language),
    theme_color:       trimmedOr(raw?.theme_color, SITE.themeColor),
    og_image:          trimmedOr(raw?.og_image, SITE.ogImage),
    founding_year:     intOr(raw?.founding_year, BUSINESS.foundingYear),
    price_range:       trimmedOr(raw?.price_range, BUSINESS.priceRange),
    area_served:       arrayOfStrings(raw?.area_served, BUSINESS.areaServed),
    keywords_global:   arrayOfStrings(raw?.keywords_global, SITE.keywords),
  };
}
