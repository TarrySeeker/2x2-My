/**
 * Константы для SEO/JSON-LD/мета-тегов.
 *
 * Источник истины по бренду «2х2». Значения должны совпадать с
 * `supabase/seed.sql` (блок settings) и `content/home.ts`. Если
 * меняете здесь — проверьте оба источника.
 *
 * Ведёт: seo-specialist (Этап 1).
 */

import { siteUrl } from "@/lib/siteConfig";

export const SITE = {
  url: siteUrl,
  name: "Рекламная компания 2х2",
  shortName: "2х2",
  legalName: "ИП Сивоконь А.А.",
  slogan: "2х2 — потому что с нами просто!",
  description:
    "Рекламная компания «2х2» в Ханты-Мансийске: полиграфия, наружная реклама, вывески, световые буквы, стелы, оформление фасадов. Работаем по ХМАО-Югре и ЯНАО.",
  shortDescription:
    "Полиграфия, вывески, наружная реклама и фасады под ключ в Ханты-Мансийске и ХМАО.",
  keywords: [
    "рекламная компания ханты-мансийск",
    "реклама хмао",
    "наружная реклама ханты-мансийск",
    "полиграфия ханты-мансийск",
    "вывески ханты-мансийск",
    "световые буквы хмао",
    "печать визиток ханты-мансийск",
    "баннер ханты-мансийск",
    "стелы азс",
    "оформление фасадов хмао",
    "реклама сургут",
    "2х2 реклама",
  ],
  locale: "ru_RU",
  language: "ru",
  themeColor: "#FF6600",
  ogImage: "/og-image.jpg",
} as const;

export const CONTACTS = {
  phonePrimary: "+7 (932) 424-77-40",
  phonePrimaryTel: "+79324247740",
  phoneSecondary: "+7 (904) 480-77-40",
  phoneSecondaryTel: "+79044807740",
  email: "sj_alex86@mail.ru",
  telegram: "https://t.me/ra2x2_hmao",
  whatsapp: "https://wa.me/79324247740",
  vk: "https://vk.com/ra2x2_hmao",
} as const;

export const ADDRESS = {
  streetAddress: "ул. Парковая, 92 Б",
  addressLocality: "Ханты-Мансийск",
  addressRegion: "ХМАО — Югра",
  addressCountry: "RU",
  postalCode: "628011",
  // Координаты офиса (заглушка — подтвердить у клиента)
  latitude: 61.00348,
  longitude: 69.01876,
} as const;

export const HOURS = {
  weekdays: { opens: "09:00", closes: "19:00" },
  weekend: "по телефону",
} as const;

export const BUSINESS = {
  foundingYear: 2014,
  priceRange: "₽₽",
  areaServed: [
    "Ханты-Мансийск",
    "Сургут",
    "Нижневартовск",
    "Нефтеюганск",
    "Нягань",
    "Когалым",
    "Мегион",
    "Лангепас",
    "Пыть-Ях",
    "Урай",
    "пгт. Фёдоровский",
    "Новый Уренгой",
    "ХМАО-Югра",
    "ЯНАО",
  ],
} as const;

/** Абсолютный URL из относительного пути. */
export function absoluteUrl(path = "/"): string {
  if (path.startsWith("http")) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${clean}`;
}
