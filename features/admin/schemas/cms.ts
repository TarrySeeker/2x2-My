import { z } from "zod";
import { safeUrl } from "./_shared";

/**
 * Zod-схемы для контента секций главной (homepage_sections).
 *
 * Каждая секция имеет фиксированный шаблон. Backend использует эти
 * схемы для валидации перед upsert. Если структура секции расширяется
 * клиентом — обновлять и схему здесь, и UI-форму, и сидинг
 * `db/seed_cms.sql`.
 *
 * Все длины полей выбраны с запасом (заголовки до 200, параграфы до
 * 5000) — клиент сам решает, насколько коротко писать.
 *
 * URL-поля валидируются через `safeUrl` (whitelist схем) — защита от
 * stored-XSS вида `javascript:alert(1)` при рендере как `<a href>`.
 */

// ── Базовые helpers ──
const shortText = z.string().min(1).max(300);
const optionalText = z.string().max(5000).optional().default("");
const optionalUrl = safeUrl;
const iconName = z.string().max(60).optional().default("");

// ── Секции ──

export const heroSectionSchema = z.object({
  eyebrow:            z.string().max(200).optional().default(""),
  headline_line1:     z.string().max(300).optional().default(""),
  headline_accent:    z.string().max(300).optional().default(""),
  headline_line3:     z.string().max(300).optional().default(""),
  /**
   * Чередующийся массив заголовков. Если задан и непустой — Hero
   * показывает их по очереди (каждые 2с) вместо статичного headline.
   * Фолбэк: при пустом массиве используется headline_line1/accent/line3.
   * Правка клиента 2026-04-24.
   */
  titles:             z.array(z.string().max(300)).max(6).optional().default([]),
  typewriter:         z.string().max(300).optional().default(""),
  subheadline:        z.string().max(1000).optional().default(""),
  cta_primary_text:   z.string().max(120).optional().default(""),
  cta_primary_url:    optionalUrl,
  cta_secondary_text: z.string().max(120).optional().default(""),
  cta_secondary_url:  optionalUrl,
});

export const aboutSectionSchema = z.object({
  badge:    z.string().max(120).optional().default(""),
  headline: shortText,
  paragraphs: z.array(z.string().max(2000)).max(10).default([]),
  highlight_card: z
    .object({
      text: z.string().max(200),
      icon: iconName,
    })
    .nullable()
    .optional()
    .default(null),
  stats: z
    .array(
      z.object({
        icon: iconName,
        value: z.union([z.number(), z.string()]),
        suffix: z.string().max(20).optional().default(""),
        label: z.string().max(200),
      }),
    )
    .max(8)
    .default([]),
  cta_text: z.string().max(120).optional().default(""),
  cta_url: optionalUrl,
});

const serviceItemSchema = z.object({
  icon:        iconName,
  title:       z.string().max(200),
  description: z.string().max(1000).optional().default(""),
  badge:       z.string().max(200).optional().default(""),
  image:       z.string().max(2000).optional().default(""),
  width:       z.string().max(50).optional().default(""),
  height:      z.string().max(50).optional().default(""),
  cta_text:    z.string().max(60).optional().default("Заказать"),
});

const alsoWeDoItemSchema = z.object({
  icon:    iconName,
  title:   z.string().max(200),
  bullets: z.array(z.string().max(300)).max(10).default([]),
});

export const servicesSectionSchema = z.object({
  headline:    shortText,
  subheadline: optionalText,
  items: z.array(serviceItemSchema).max(8).default([]),
  also_we_do_text:     z.string().max(200).optional().default(""),
  also_we_do_subtitle: z.string().max(300).optional().default(""),
  also_we_do_items:    z.array(alsoWeDoItemSchema).max(8).default([]),
});

export const promotionsSectionSchema = z.object({
  headline:    shortText,
  subheadline: optionalText,
  cta_text:    z.string().max(120).optional().default(""),
  cta_url:     optionalUrl,
});

export const portfolioSectionSchema = z.object({
  headline:         shortText,
  subheadline:      optionalText,
  more_button_text: z.string().max(120).optional().default(""),
  more_button_url:  optionalUrl,
});

const featureItemSchema = z.object({
  icon:        iconName,
  title:       z.string().max(200),
  description: z.string().max(500).optional().default(""),
  extra:       z.string().max(500).optional().default(""),
});

export const featuresSectionSchema = z.object({
  headline:    shortText,
  subheadline: optionalText,
  items: z.array(featureItemSchema).max(12).default([]),
});

const faqItemSchema = z.object({
  question: z.string().max(300),
  answer:   z.string().max(5000),
  emoji:    z.string().max(8).optional().default(""),
});

export const faqSectionSchema = z.object({
  headline:    shortText,
  subheadline: optionalText,
  items: z.array(faqItemSchema).max(30).default([]),
});

export const ctaSectionSchema = z.object({
  headline:    shortText,
  subheadline: z.string().max(1000).optional().default(""),
  button_text: z.string().max(120).optional().default(""),
  button_url:  optionalUrl,
  phone_text:  z.string().max(120).optional().default(""),
});

export const SECTION_SCHEMAS = {
  hero:       heroSectionSchema,
  about:      aboutSectionSchema,
  services:   servicesSectionSchema,
  promotions: promotionsSectionSchema,
  portfolio:  portfolioSectionSchema,
  features:   featuresSectionSchema,
  faq:        faqSectionSchema,
  cta:        ctaSectionSchema,
} as const satisfies Record<string, z.ZodTypeAny>;

export type SectionKey = keyof typeof SECTION_SCHEMAS;

export const SECTION_KEYS = Object.keys(SECTION_SCHEMAS) as SectionKey[];

export function isValidSectionKey(key: string): key is SectionKey {
  return key in SECTION_SCHEMAS;
}

export function getSectionSchema(key: SectionKey): z.ZodTypeAny {
  return SECTION_SCHEMAS[key];
}
