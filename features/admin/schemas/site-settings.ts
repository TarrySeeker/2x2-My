import { z } from "zod";
import { safeUrl } from "./_shared";

/**
 * Zod-схемы для site_settings (новой CMS-таблицы из миграции 006).
 *
 * Каждый ключ — отдельная схема. Backend выбирает схему по ключу
 * перед `upsertSetting`. Структуру синхронно держать с
 * `db/seed_cms.sql` и `db/migrations/012_site_settings_extend.sql`.
 *
 * НЕ путать с `settings.ts` (старая ключ-значение таблица для магазина:
 * store_name, store_phone и т.п.).
 */

const optionalUrl = z
  .string()
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => (v ? v.trim() : ""));

export const contactsSettingSchema = z.object({
  phone_primary:   z.string().min(1).max(50),
  phone_secondary: z.string().max(50).optional().default(""),
  email:           z.string().max(200).optional().default(""),
  address:         z.string().max(500).optional().default(""),
  address_geo: z
    .object({
      lat: z.number().nullable().default(null),
      lng: z.number().nullable().default(null),
    })
    .optional()
    .default({ lat: null, lng: null }),
});

export const businessHoursSettingSchema = z.object({
  weekdays:       z.string().max(120).optional().default(""),
  weekend:        z.string().max(120).optional().default(""),
  weekdays_short: z.string().max(40).optional().default(""),
  weekend_short:  z.string().max(40).optional().default(""),
});

export const socialsSettingSchema = z.object({
  vk:       optionalUrl,
  telegram: optionalUrl,
  dzen:     optionalUrl,
  // MAX (max.ru) — российский мессенджер от VK. Добавлен миграцией 033.
  // Структурно идентичен остальным соцсетям: опциональный URL.
  max:      optionalUrl,
});

export const statsSettingSchema = z.object({
  years_in_business: z.number().int().nonnegative().optional().default(0),
  projects_done:     z.number().int().nonnegative().optional().default(0),
  clients_count:     z.number().int().nonnegative().optional().default(0),
  cities_count:      z.number().int().nonnegative().optional().default(0),
  regions:           z.string().max(200).optional().default(""),
});

export const seoDefaultsSettingSchema = z.object({
  title_template:      z.string().max(200).optional().default(""),
  default_description: z.string().max(500).optional().default(""),
  default_og_image:    z.string().max(2000).optional().default(""),
});

export const pdConsentSettingSchema = z.object({
  current_version: z.string().min(1).max(40),
  policy_url:      z.string().min(1).max(500),
});

// ============================================================
// legal_entity — юр. реквизиты компании (миграция 008).
// Используется на /privacy, в футере и в договорах.
// Все поля опциональные — клиент заполняет через админку.
// Валидация цифровых полей — через regex (пустая строка тоже ок).
// ============================================================
const digitsOrEmpty = (exact: number[], label: string) =>
  z
    .string()
    .max(40)
    .optional()
    .default("")
    .refine(
      (v) => {
        if (!v) return true;                // пустая строка допустима
        if (!/^\d+$/.test(v)) return false; // только цифры
        return exact.includes(v.length);    // длина — одна из допустимых
      },
      {
        message: `${label}: ожидаются только цифры, длина ${exact.join(" или ")}`,
      },
    );

export const legalEntitySettingSchema = z.object({
  legal_name:     z.string().max(300).optional().default(""),
  inn:            digitsOrEmpty([10, 12], "ИНН"),                 // 10 — ЮЛ, 12 — ИП
  ogrn:           digitsOrEmpty([13, 15], "ОГРН/ОГРНИП"),         // 13 — ОГРН, 15 — ОГРНИП
  kpp:            digitsOrEmpty([9], "КПП"),                      // 9 знаков
  legal_address:  z.string().max(500).optional().default(""),
  actual_address: z.string().max(500).optional().default(""),
  ceo_name:       z.string().max(200).optional().default(""),
  bank_account:   digitsOrEmpty([20], "Расчётный счёт"),          // 20 цифр
  bank_name:      z.string().max(200).optional().default(""),
  bik:            digitsOrEmpty([9], "БИК"),                      // 9 цифр
});

// ============================================================
// organization — глобальные данные бренда (миграция 012).
// Заменяет hardcoded SITE + BUSINESS из lib/seo/site.ts.
// Используется в JSON-LD (Organization), метаданных, футере.
// ============================================================
export const organizationSettingSchema = z.object({
  name:              z.string().min(1).max(300),
  short_name:        z.string().max(60).optional().default(""),
  legal_name:        z.string().max(300).optional().default(""),
  slogan:            z.string().max(300).optional().default(""),
  description:       z.string().max(1000).optional().default(""),
  short_description: z.string().max(300).optional().default(""),
  locale:            z.string().max(20).optional().default("ru_RU"),
  language:          z.string().max(10).optional().default("ru"),
  theme_color:       z
    .string()
    .max(20)
    .optional()
    .default("#FF6600")
    .refine((v) => !v || /^#[0-9A-Fa-f]{3,8}$/.test(v), {
      message: "theme_color должен быть HEX-цветом (#RGB или #RRGGBB)",
    }),
  og_image:          z.string().max(2000).optional().default(""),
  founding_year:     z.number().int().min(1900).max(2100).optional().default(2014),
  price_range:       z.string().max(20).optional().default(""),
  area_served:       z.array(z.string().max(200)).max(50).default([]),
  keywords_global:   z.array(z.string().max(200)).max(30).default([]),
});

// ============================================================
// navigation_header — массив пунктов верхнего меню (миграция 012).
// ============================================================
const navItemSchema = z.object({
  href:    safeUrl,
  label:   z.string().min(1).max(100),
  order:   z.number().int().min(0).max(1000).default(0),
  visible: z.boolean().default(true),
});

export const navigationHeaderSettingSchema = z.object({
  items: z.array(navItemSchema).max(20).default([]),
});

// ============================================================
// navigation_footer — колонки футера со списками ссылок (миграция 012).
// ============================================================
const footerColumnItemSchema = z.object({
  href:  safeUrl,
  label: z.string().min(1).max(100),
});

const footerColumnSchema = z.object({
  title: z.string().min(1).max(100),
  items: z.array(footerColumnItemSchema).max(20).default([]),
});

export const navigationFooterSettingSchema = z.object({
  columns: z.array(footerColumnSchema).max(6).default([]),
});

// ============================================================
// homepage_trust_bar — логотипы клиентов под hero главной (миграция 012).
// Текст настраиваемый, клиенты — массив {name, logo}.
// ============================================================
const trustBarClientSchema = z.object({
  name: z.string().min(1).max(120),
  logo: z.string().max(2000).default(""),
});

export const homepageTrustBarSettingSchema = z.object({
  text:    z.string().max(500).optional().default(""),
  clients: z.array(trustBarClientSchema).max(20).default([]),
});

export const SITE_SETTING_SCHEMAS = {
  contacts:          contactsSettingSchema,
  business_hours:    businessHoursSettingSchema,
  socials:           socialsSettingSchema,
  stats:             statsSettingSchema,
  seo_defaults:      seoDefaultsSettingSchema,
  pd_consent:        pdConsentSettingSchema,
  legal_entity:      legalEntitySettingSchema,
  organization:      organizationSettingSchema,
  navigation_header: navigationHeaderSettingSchema,
  navigation_footer: navigationFooterSettingSchema,
  homepage_trust_bar: homepageTrustBarSettingSchema,
} as const satisfies Record<string, z.ZodTypeAny>;

export type SiteSettingKey = keyof typeof SITE_SETTING_SCHEMAS;

export const SITE_SETTING_KEYS = Object.keys(
  SITE_SETTING_SCHEMAS,
) as SiteSettingKey[];

export function isValidSiteSettingKey(key: string): key is SiteSettingKey {
  return key in SITE_SETTING_SCHEMAS;
}

export function getSiteSettingSchema(key: SiteSettingKey): z.ZodTypeAny {
  return SITE_SETTING_SCHEMAS[key];
}
