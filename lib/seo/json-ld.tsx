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

type JsonLdData = Record<string, unknown>;

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

export function buildOrganization(): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    legalName: SITE.legalName,
    alternateName: SITE.shortName,
    description: SITE.description,
    slogan: SITE.slogan,
    url: SITE.url,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/logo-2x2.svg"),
      width: 512,
      height: 512,
    },
    image: absoluteUrl(SITE.ogImage),
    email: CONTACTS.email,
    telephone: CONTACTS.phonePrimaryTel,
    foundingDate: String(BUSINESS.foundingYear),
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

export function buildLocalBusiness(): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE.url}/#localbusiness`,
    name: SITE.name,
    image: absoluteUrl(SITE.ogImage),
    logo: absoluteUrl("/logo-2x2.svg"),
    description: SITE.description,
    url: SITE.url,
    telephone: CONTACTS.phonePrimaryTel,
    email: CONTACTS.email,
    priceRange: BUSINESS.priceRange,
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
    areaServed: BUSINESS.areaServed.map((name) => ({
      "@type": "City",
      name,
    })),
  };
}

export function buildWebSite(): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    description: SITE.description,
    inLanguage: SITE.language,
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
          url: absoluteUrl(`/product/${p.slug}`),
          seller: { "@id": `${SITE.url}/#organization` },
          ...(p.unit ? { priceSpecification: { "@type": "UnitPriceSpecification", price: p.priceFrom, priceCurrency: "RUB", unitText: p.unit } } : {}),
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": absoluteUrl(`/product/${p.slug}#product`),
    name: p.name,
    description: p.description,
    sku: p.sku ?? p.slug,
    url: absoluteUrl(`/product/${p.slug}`),
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
    "@id": absoluteUrl(`/product/${s.slug}#service`),
    name: s.name,
    description: s.description,
    serviceType: s.categoryName ?? "Реклама и полиграфия",
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: BUSINESS.areaServed.map((name) => ({ "@type": "City", name })),
    url: absoluteUrl(`/product/${s.slug}`),
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
