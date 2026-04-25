import { z } from "zod";
import { safeUrl } from "./_shared";
import {
  heroSectionSchema    as homeHeroSectionSchema,
  aboutSectionSchema   as homeAboutSectionSchema,
  servicesSectionSchema as homeServicesSectionSchema,
  promotionsSectionSchema as homePromotionsSectionSchema,
  portfolioSectionSchema  as homePortfolioSectionSchema,
  featuresSectionSchema   as homeFeaturesSectionSchema,
  faqSectionSchema        as homeFaqSectionSchema,
  ctaSectionSchema        as homeCtaSectionSchema,
} from "./cms";

/**
 * Zod-схемы для таблицы `page_sections` (миграция 010).
 *
 * Каждый `content_type` имеет свою структуру content-JSONB. Backend
 * выбирает схему по content_type и валидирует перед upsert.
 *
 * Секции, использующиеся текущим seed'ом:
 *   hero          → heroPageSectionSchema
 *   text_block    → textBlockSectionSchema
 *   values        → valuesSectionSchema
 *   cards_grid    → cardsGridSectionSchema
 *   faq           → faqSectionContentSchema  (НЕ путать с homepage faq!)
 *   cta           → ctaSectionContentSchema
 *   contact_info  → contactInfoSectionSchema
 *   stats_grid    → statsGridSectionSchema
 *
 * Семантика «hero» здесь отличается от главной: это стандартный
 * ServicesHero-компонент с полями badge/title/description без чередующихся
 * заголовков и кнопок. Используется на не-главных страницах.
 */

const shortText = z.string().min(1).max(300);
const iconName = z.string().max(60).optional().default("");

// ── hero ──
// Стандартный hero-блок страницы (badge, title, description).
export const heroPageSectionSchema = z.object({
  badge:       z.string().max(120).optional().default(""),
  title:       shortText,
  description: z.string().max(500).optional().default(""),
});

// ── text_block ──
// Длинный текстовый блок с опциональной миссией, статами, иллюстрацией.
// Используется в /about → story.
export const textBlockSectionSchema = z.object({
  headline:   z.string().max(300).optional().default(""),
  paragraphs: z.array(z.string().max(3000)).max(15).default([]),
  mission: z
    .object({
      title: z.string().max(200),
      text:  z.string().max(1000),
    })
    .nullable()
    .optional()
    .default(null),
  stats: z
    .array(
      z.object({
        value: z.union([z.string().max(60), z.number()]),
        label: z.string().max(200),
      }),
    )
    .max(8)
    .default([]),
  image:     z.string().max(2000).optional().default(""),
  image_alt: z.string().max(300).optional().default(""),
});

// ── values ──
// Блок «Наши ценности» с иконкой+заголовком+описанием.
const valueItemSchema = z.object({
  icon:        iconName,
  title:       z.string().max(200),
  description: z.string().max(500).optional().default(""),
});
export const valuesSectionSchema = z.object({
  headline:    z.string().max(300).optional().default(""),
  subheadline: z.string().max(500).optional().default(""),
  items:       z.array(valueItemSchema).max(8).default([]),
});

// ── cards_grid ──
// Универсальная сетка карточек со ссылками (используется для /calculator/categories).
const cardItemSchema = z.object({
  icon:        iconName,
  title:       z.string().max(200),
  description: z.string().max(500).optional().default(""),
  href:        safeUrl,
  badge:       z.string().max(120).optional().default(""),
});
export const cardsGridSectionSchema = z.object({
  headline:         z.string().max(300).optional().default(""),
  subheadline:      z.string().max(500).optional().default(""),
  items:            z.array(cardItemSchema).max(24).default([]),
  cta_text_on_card: z.string().max(120).optional().default(""),
});

// ── faq ──
// FAQ блок для любой страницы (отдельно от homepage_sections.faq).
const faqItemContentSchema = z.object({
  question: z.string().max(500),
  answer:   z.string().max(5000),
  emoji:    z.string().max(8).optional().default(""),
});
export const faqSectionContentSchema = z.object({
  headline:    z.string().max(300).optional().default(""),
  subheadline: z.string().max(500).optional().default(""),
  items:       z.array(faqItemContentSchema).max(40).default([]),
});

// ── cta ──
// Call-to-action блок внизу страницы.
export const ctaSectionContentSchema = z.object({
  headline:    shortText,
  subheadline: z.string().max(1000).optional().default(""),
  button_text: z.string().max(120).optional().default(""),
  button_url:  safeUrl,
});

// ── contact_info ──
// Список способов связи. Значения могут быть:
//   - "binding": string   — тогда UI подставляет значение из site_settings (напр. contacts.phone_primary)
//   - "value": string     — прямое значение из CMS (не привязано к settings)
const contactInfoItemSchema = z.object({
  icon:     iconName,
  label:    z.string().max(200),
  binding:  z.string().max(200).optional().nullable(),
  value:    z.string().max(500).optional().nullable(),
  link:     safeUrl,
  external: z.boolean().optional().default(false),
});
export const contactInfoSectionSchema = z.object({
  items:            z.array(contactInfoItemSchema).max(20).default([]),
  form_title:       z.string().max(200).optional().default(""),
  info_title:       z.string().max(200).optional().default(""),
  map_embed_url:    safeUrl,
  map_iframe_title: z.string().max(200).optional().default(""),
});

// ── stats_grid ──
// Сетка статистики (value + label). Используется в /about при желании.
export const statsGridSectionSchema = z.object({
  items: z
    .array(
      z.object({
        value: z.union([z.string().max(60), z.number()]),
        label: z.string().max(200),
        icon:  iconName,
      }),
    )
    .max(12)
    .default([]),
});

// ── Главная страница ('/') ──
// Контент-типы `home_*` сохраняют 1:1 структуру старой таблицы
// `homepage_sections`. После миграции 017 источник истины для главной —
// page_sections с этими content_type. Schemas re-экспортируются из cms.ts,
// чтобы существующие админ-формы (HomepageSectionEditor) продолжали работать.

// ── Registry ──
export const PAGE_SECTION_SCHEMAS = {
  hero:         heroPageSectionSchema,
  text_block:   textBlockSectionSchema,
  values:       valuesSectionSchema,
  cards_grid:   cardsGridSectionSchema,
  faq:          faqSectionContentSchema,
  cta:          ctaSectionContentSchema,
  contact_info: contactInfoSectionSchema,
  stats_grid:   statsGridSectionSchema,
  // Главная — переиспользуем homepage-схемы под уникальными ключами
  home_hero:       homeHeroSectionSchema,
  home_about:      homeAboutSectionSchema,
  home_services:   homeServicesSectionSchema,
  home_promotions: homePromotionsSectionSchema,
  home_portfolio:  homePortfolioSectionSchema,
  home_features:   homeFeaturesSectionSchema,
  home_faq:        homeFaqSectionSchema,
  home_cta:        homeCtaSectionSchema,
} as const satisfies Record<string, z.ZodTypeAny>;

export type PageSectionContentType = keyof typeof PAGE_SECTION_SCHEMAS;

export const PAGE_SECTION_CONTENT_TYPES = Object.keys(
  PAGE_SECTION_SCHEMAS,
) as PageSectionContentType[];

export function isValidPageSectionContentType(
  value: string,
): value is PageSectionContentType {
  return value in PAGE_SECTION_SCHEMAS;
}

export function getPageSectionSchema(
  contentType: PageSectionContentType,
): z.ZodTypeAny {
  return PAGE_SECTION_SCHEMAS[contentType];
}

/**
 * Белый список пар (page_path, section_key, content_type) —
 * страховка, чтобы админка не могла создать секцию с произвольным
 * ключом на произвольной странице.
 */
export const PAGE_SECTIONS_ALLOWED: readonly {
  page_path: string;
  section_key: string;
  content_type: PageSectionContentType;
}[] = [
  // / (главная) — после миграции 017 единственный источник истины.
  // Порядок display_order контролируется в миграции/админке, не здесь.
  { page_path: "/",           section_key: "hero",          content_type: "home_hero"       },
  { page_path: "/",           section_key: "about",         content_type: "home_about"      },
  { page_path: "/",           section_key: "services",      content_type: "home_services"   },
  { page_path: "/",           section_key: "promotions",    content_type: "home_promotions" },
  { page_path: "/",           section_key: "portfolio",     content_type: "home_portfolio"  },
  { page_path: "/",           section_key: "features",      content_type: "home_features"   },
  { page_path: "/",           section_key: "faq",           content_type: "home_faq"        },
  { page_path: "/",           section_key: "cta",           content_type: "home_cta"        },
  // /about
  { page_path: "/about",      section_key: "hero",          content_type: "hero"         },
  { page_path: "/about",      section_key: "story",         content_type: "text_block"   },
  { page_path: "/about",      section_key: "values",        content_type: "values"       },
  { page_path: "/about",      section_key: "cta",           content_type: "cta"          },
  // /contacts
  { page_path: "/contacts",   section_key: "hero",          content_type: "hero"         },
  { page_path: "/contacts",   section_key: "contact_info",  content_type: "contact_info" },
  // /calculator
  { page_path: "/calculator", section_key: "hero",          content_type: "hero"         },
  { page_path: "/calculator", section_key: "categories",    content_type: "cards_grid"   },
  { page_path: "/calculator", section_key: "faq",           content_type: "faq"          },
  { page_path: "/calculator", section_key: "cta",           content_type: "cta"          },
  // /portfolio
  { page_path: "/portfolio",  section_key: "hero",          content_type: "hero"         },
  // /faq
  { page_path: "/faq",        section_key: "hero",          content_type: "hero"         },
  { page_path: "/faq",        section_key: "items",         content_type: "faq"          },
  { page_path: "/faq",        section_key: "cta",           content_type: "cta"          },
  // /blog
  { page_path: "/blog",       section_key: "hero",          content_type: "hero"         },
  // /services
  { page_path: "/services",   section_key: "hero",          content_type: "hero"         },
];

export function isAllowedPageSection(
  page_path: string,
  section_key: string,
  content_type: string,
): boolean {
  return PAGE_SECTIONS_ALLOWED.some(
    (a) =>
      a.page_path === page_path &&
      a.section_key === section_key &&
      a.content_type === content_type,
  );
}
