/**
 * Билдеры JSON-LD (schema.org) для «2х2».
 *
 * Все функции возвращают plain-объекты, которые оборачиваются в
 * `<JsonLdScript>` (тонкая обёртка над `<script type="application/ld+json">`).
 *
 * Применяй в layout (Organization + LocalBusiness + WebSite) и в
 * конкретных страницах (Product, Service, Article, BreadcrumbList, FAQPage).
 *
 * Ведёт: seo-specialist.
 */

import { ADDRESS, BUSINESS, CONTACTS, HOURS, SITE, absoluteUrl } from "@/lib/seo/site";
import type { OrganizationSettings } from "@/lib/cms/organization";

type JsonLdData = Record<string, unknown>;

/**
 * Опциональные CMS-overrides из site_settings.organization.
 * Если поля нет — фолбэк на константы SITE/BUSINESS.
 */
export type OrgOverrides = Partial<
  Pick<
    OrganizationSettings,
    | "name"
    | "short_name"
    | "legal_name"
    | "slogan"
    | "description"
    | "og_image"
    | "language"
    | "founding_year"
    | "price_range"
    | "area_served"
  >
>;

type Props = { data: JsonLdData | JsonLdData[] };

/** Inline-скрипт <script type="application/ld+json"> — для Server Components. */
export function JsonLdScript({ data }: Props) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, i) => (
        <script
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}

// ============================================================
// Базовые блоки
// ============================================================

export function buildOrganization(org?: OrgOverrides): JsonLdData {
  const name = org?.name || SITE.name;
  const legalName = org?.legal_name || SITE.legalName;
  const altName = org?.short_name || SITE.shortName;
  const description = org?.description || SITE.description;
  const slogan = org?.slogan || SITE.slogan;
  const ogImage = org?.og_image || SITE.ogImage;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name,
    legalName,
    alternateName: altName,
    description,
    slogan,
    url: SITE.url,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo-2x2.svg"),
      width: 512,
      height: 512,
    },
    image: absoluteUrl(ogImage),
    email: CONTACTS.email,
    telephone: CONTACTS.phonePrimaryTel,
    foundingDate: String(org?.founding_year ?? BUSINESS.foundingYear),
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS.streetAddress,
      addressLocality: ADDRESS.addressLocality,
      addressRegion: ADDRESS.addressRegion,
      postalCode: ADDRESS.postalCode,
      addressCountry: ADDRESS.addressCountry,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: CONTACTS.phonePrimaryTel,
        contactType: "customer service",
        areaServed: "RU",
        availableLanguage: ["Russian"],
      },
      {
        "@type": "ContactPoint",
        telephone: CONTACTS.phoneSecondaryTel,
        contactType: "sales",
        areaServed: "RU",
        availableLanguage: ["Russian"],
      },
    ],
    sameAs: [CONTACTS.telegram, CONTACTS.vk, CONTACTS.whatsapp],
  };
}

export function buildLocalBusiness(org?: OrgOverrides): JsonLdData {
  const name = org?.name || SITE.name;
  const description = org?.description || SITE.description;
  const ogImage = org?.og_image || SITE.ogImage;
  const priceRange = org?.price_range || BUSINESS.priceRange;
  const areaServed =
    org?.area_served && org.area_served.length > 0
      ? org.area_served
      : BUSINESS.areaServed;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE.url}/#localbusiness`,
    name,
    image: absoluteUrl(ogImage),
    logo: absoluteUrl("/logo-2x2.svg"),
    description,
    url: SITE.url,
    telephone: CONTACTS.phonePrimaryTel,
    email: CONTACTS.email,
    priceRange,
    currenciesAccepted: "RUB",
    paymentAccepted: "Cash, Credit Card, СБП",
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS.streetAddress,
      addressLocality: ADDRESS.addressLocality,
      addressRegion: ADDRESS.addressRegion,
      postalCode: ADDRESS.postalCode,
      addressCountry: ADDRESS.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: ADDRESS.latitude,
      longitude: ADDRESS.longitude,
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: HOURS.weekdays.opens,
        closes: HOURS.weekdays.closes,
      },
    ],
    areaServed: areaServed.map((cityName) => ({
      "@type": "City",
      name: cityName,
    })),
  };
}

export function buildWebSite(org?: OrgOverrides): JsonLdData {
  const name = org?.name || SITE.name;
  const altName = org?.short_name || SITE.shortName;
  const description = org?.description || SITE.description;
  const language = org?.language || SITE.language;

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name,
    alternateName: altName,
    url: SITE.url,
    description,
    inLanguage: language,
    publisher: { "@id": `${SITE.url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ============================================================
// Breadcrumbs
// ============================================================

export type BreadcrumbItem = { name: string; url: string };

export function buildBreadcrumbList(items: BreadcrumbItem[]): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

// ============================================================
// Product (для карточки товара/услуги)
// ============================================================

export type ProductSeoInput = {
  name: string;
  slug: string;
  description: string;
  image?: string | string[];
  priceFrom?: number;
  unit?: string;
  categoryName?: string;
  sku?: string;
  ratingValue?: number;
  ratingCount?: number;
};

export function buildProduct(p: ProductSeoInput): JsonLdData {
  const images = Array.isArray(p.image) ? p.image : p.image ? [p.image] : [];
  const offer =
    typeof p.priceFrom === "number"
      ? {
          "@type": "Offer",
          priceCurrency: "RUB",
          price: p.priceFrom,
          availability: "https://schema.org/InStock",
          url: absoluteUrl(`/services/${p.slug}`),
          seller: { "@id": `${SITE.url}/#organization` },
          ...(p.unit ? { priceSpecification: { "@type": "UnitPriceSpecification", price: p.priceFrom, priceCurrency: "RUB", unitText: p.unit } } : {}),
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": absoluteUrl(`/services/${p.slug}#product`),
    name: p.name,
    description: p.description,
    sku: p.sku ?? p.slug,
    url: absoluteUrl(`/services/${p.slug}`),
    image: images.map((src) => absoluteUrl(src)),
    brand: { "@type": "Brand", name: SITE.shortName },
    category: p.categoryName,
    ...(offer ? { offers: offer } : {}),
    ...(p.ratingValue && p.ratingCount
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.ratingValue,
            reviewCount: p.ratingCount,
          },
        }
      : {}),
  };
}

// ============================================================
// Service (для услуги с индивидуальным расчётом)
// ============================================================

export type ServiceSeoInput = {
  name: string;
  slug: string;
  description: string;
  categoryName?: string;
  image?: string;
  priceFrom?: number;
  unit?: string;
};

export function buildService(s: ServiceSeoInput): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": absoluteUrl(`/services/${s.slug}#service`),
    name: s.name,
    description: s.description,
    serviceType: s.categoryName ?? "Реклама и полиграфия",
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: BUSINESS.areaServed.map((name) => ({ "@type": "City", name })),
    url: absoluteUrl(`/services/${s.slug}`),
    ...(s.image ? { image: absoluteUrl(s.image) } : {}),
    ...(typeof s.priceFrom === "number"
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "RUB",
            price: s.priceFrom,
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: s.priceFrom,
              priceCurrency: "RUB",
              unitText: s.unit ?? "за единицу",
            },
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };
}

// ============================================================
// Article (для блога)
// ============================================================

export type ArticleSeoInput = {
  title: string;
  slug: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  readTimeMin?: number;
};

export function buildArticle(a: ArticleSeoInput): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": absoluteUrl(`/blog/${a.slug}#article`),
    headline: a.title,
    description: a.description,
    image: [absoluteUrl(a.image)],
    datePublished: a.datePublished,
    dateModified: a.dateModified ?? a.datePublished,
    author: {
      "@type": "Organization",
      name: a.authorName ?? SITE.name,
      url: SITE.url,
    },
    publisher: { "@id": `${SITE.url}/#organization` },
    mainEntityOfPage: absoluteUrl(`/blog/${a.slug}`),
    inLanguage: SITE.language,
    ...(a.readTimeMin ? { timeRequired: `PT${a.readTimeMin}M` } : {}),
  };
}

// ============================================================
// FAQPage
// ============================================================

export type FaqItem = { question: string; answer: string };

export function buildFaqPage(items: FaqItem[]): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

// ============================================================
// CreativeWork (для портфолио)
// ============================================================

export type PortfolioSeoInput = {
  title: string;
  slug: string;
  description: string;
  image: string;
  datePublished?: string;
  clientName?: string;
  location?: string;
};

export function buildPortfolioWork(w: PortfolioSeoInput): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": absoluteUrl(`/portfolio/${w.slug}#work`),
    name: w.title,
    description: w.description,
    image: absoluteUrl(w.image),
    creator: { "@id": `${SITE.url}/#organization` },
    ...(w.datePublished ? { datePublished: w.datePublished } : {}),
    ...(w.clientName ? { sourceOrganization: { "@type": "Organization", name: w.clientName } } : {}),
    ...(w.location
      ? { contentLocation: { "@type": "Place", name: w.location } }
      : {}),
  };
}
