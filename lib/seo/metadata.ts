/**
 * Помощники для построения `Metadata` (Next.js App Router).
 *
 * Используй `buildMetadata(...)` внутри `generateMetadata` каждой страницы.
 * Он соберёт title/description/canonical/OG/Twitter по единому шаблону.
 *
 * Ведёт: seo-specialist.
 */

import type { Metadata } from "next";
import { SITE, absoluteUrl } from "@/lib/seo/site";

export type SeoInput = {
  /** Заголовок страницы (без суффикса бренда — он добавится из template). */
  title: string;
  description: string;
  /** Путь относительно корня, например `/catalog/polygrafiya`. */
  path: string;
  /** Относительный путь к изображению для OG. */
  image?: string;
  /** Тип страницы для OG. По умолчанию `website`. */
  type?: "website" | "article";
  /** Список keywords (для совместимости со старыми поисковиками). */
  keywords?: readonly string[] | string[];
  /** Если `true` — `robots: noindex, follow`. */
  noindex?: boolean;
  /** Для статей блога. */
  publishedTime?: string;
  modifiedTime?: string;
  authorName?: string;
};

export function buildMetadata(input: SeoInput): Metadata {
  const url = absoluteUrl(input.path);
  const image = absoluteUrl(input.image ?? SITE.ogImage);
  const type = input.type ?? "website";

  return {
    title: input.title,
    description: input.description,
    ...(input.keywords && input.keywords.length
      ? { keywords: [...input.keywords] }
      : {}),
    alternates: {
      canonical: url,
      languages: { "ru-RU": url, "x-default": url },
    },
    openGraph: {
      type: type === "article" ? "article" : "website",
      locale: SITE.locale,
      url,
      siteName: SITE.name,
      title: input.title,
      description: input.description,
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
      ...(type === "article" && input.publishedTime
        ? {
            publishedTime: input.publishedTime,
            modifiedTime: input.modifiedTime ?? input.publishedTime,
            authors: input.authorName ? [input.authorName] : [SITE.name],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
    robots: input.noindex
      ? { index: false, follow: true, googleBot: { index: false, follow: true } }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  };
}

/** Шаблон title для карточки товара/услуги. */
export function productTitle(name: string, cityAware = true): string {
  return cityAware
    ? `${name} в Ханты-Мансийске — купить у «2х2»`
    : `${name} — «2х2»`;
}

/** Шаблон description для карточки товара/услуги. */
export function productDescription(args: {
  name: string;
  priceFrom?: number;
  unit?: string;
  shortHook?: string;
}): string {
  const parts: string[] = [];
  parts.push(`Заказать ${args.name.toLowerCase()} в Ханты-Мансийске.`);
  if (typeof args.priceFrom === "number") {
    const unit = args.unit ? ` ${args.unit}` : "";
    parts.push(`Цена от ${args.priceFrom.toLocaleString("ru-RU")} ₽${unit}.`);
  }
  if (args.shortHook) parts.push(args.shortHook);
  parts.push("Доставка по ХМАО-Югре и ЯНАО. Рекламная компания «2х2».");
  return parts.join(" ").slice(0, 158);
}
