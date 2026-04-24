import { z } from "zod";

/**
 * Zod-схемы для site_settings (новой CMS-таблицы из миграции 006).
 *
 * Каждый ключ — отдельная схема. Backend выбирает схему по ключу
 * перед `upsertSetting`. Структуру синхронно держать с
 * `db/seed_cms.sql`.
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

export const SITE_SETTING_SCHEMAS = {
  contacts:       contactsSettingSchema,
  business_hours: businessHoursSettingSchema,
  socials:        socialsSettingSchema,
  stats:          statsSettingSchema,
  seo_defaults:   seoDefaultsSettingSchema,
  pd_consent:     pdConsentSettingSchema,
  legal_entity:   legalEntitySettingSchema,
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
