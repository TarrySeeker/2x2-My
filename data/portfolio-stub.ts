/**
 * Заглушка портфолио — используется до подключения Supabase.
 * Форма совпадает с таблицей `portfolio_items` из supabase/migrations/
 * (см. core/types/database.ts → PortfolioItem).
 *
 * После Этапа 2 content-manager перенесёт эти данные в supabase/seed.sql,
 * а data-fetchers будут читать их из БД.
 */
import type { PortfolioItem } from "@/types";

/**
 * Упрощённый стаб — без nullable-полей, чтобы компоненты могли обращаться
 * к полям напрямую. Реальные ряды БД совместимы через type assertion ниже.
 */
export interface PortfolioStub {
  id: number;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  category_label: string;
  client_name: string;
  industry: string;
  location: string;
  year: number;
  cover_url: string;
  images: string[];
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
}

export const PORTFOLIO_STUB: PortfolioStub[] = [
  {
    id: 1,
    title: "Полиграфия: визитки, наклейки и сопутствующая продукция",
    slug: "print-visiting-cards-catalogs",
    description:
      "Печать визиток, каталогов и наклеек; производство в типографии для корпоративных клиентов ХМАО.",
    short_description: "Печать визиток, каталогов и наклеек",
    category_label: "Полиграфия",
    client_name: "Корпоративные клиенты",
    industry: "B2B",
    location: "Ханты-Мансийск",
    year: 2024,
    cover_url: "/port/print-visiting-cards-catalogs.png",
    images: ["/port/print-visiting-cards-catalogs.png"],
    is_featured: true,
    is_published: true,
    sort_order: 10,
  },
  {
    id: 2,
    title:
      "Крышная установка ВТБ, Ханты-Мансийск, ул. Мира 38",
    slug: "vtb-rooftop-khm",
    description:
      "Проект, изготовление и монтаж крышной вывески ВТБ на здании в центре Ханты-Мансийска.",
    short_description: "Крышная вывеска ВТБ",
    category_label: "Наружная реклама",
    client_name: "ВТБ",
    industry: "Финансы",
    location: "Ханты-Мансийск",
    year: 2024,
    cover_url: "/port/1.png",
    images: ["/port/1.png"],
    is_featured: true,
    is_published: true,
    sort_order: 20,
  },
  {
    id: 3,
    title: "Стелы АЗС «АртСевер» и «Нефть», Сургут",
    slug: "azs-stele-surgut",
    description:
      "Разработка эскизов, проект, изготовление и монтаж стел для АЗС в Сургуте.",
    short_description: "Стелы АЗС в Сургуте",
    category_label: "Наружная реклама",
    client_name: "АЗС АртСевер / Нефть",
    industry: "Топливо",
    location: "Сургут",
    year: 2023,
    cover_url: "/port/5.png",
    images: ["/port/5.png"],
    is_featured: true,
    is_published: true,
    sort_order: 30,
  },
  {
    id: 4,
    title: "Декоративные фигуры и оформление городской среды",
    slug: "city-decor-surgut",
    description:
      "Световые фигуры и декоративные конструкции для оформления городской среды Сургута.",
    short_description: "Декоративные фигуры Сургут",
    category_label: "Фасады",
    client_name: "Брусника",
    industry: "Девелопмент",
    location: "Сургут",
    year: 2024,
    cover_url: "/port/3.png",
    images: ["/port/3.png"],
    is_featured: true,
    is_published: true,
    sort_order: 40,
  },
  {
    id: 5,
    title: "Реставрация имеющихся конструкций и элементов",
    slug: "restoration-fedorovsky",
    description:
      "Изготовление не световых объёмных букв и конструкций, реставрация стелы «Я ДОМА» в пгт. Фёдоровский.",
    short_description: "Реставрация стелы «Я ДОМА»",
    category_label: "Наружная реклама",
    client_name: "ЮКИОР",
    industry: "Госструктуры",
    location: "пгт. Фёдоровский",
    year: 2023,
    cover_url: "/port/4.png",
    images: ["/port/4.png"],
    is_featured: true,
    is_published: true,
    sort_order: 50,
  },
  {
    id: 6,
    title: "Разработка эскизов, проект, изготовление и монтаж наружного оформления",
    slug: "outdoor-decor-pirelli",
    description:
      "Металлоконструкции, светодиодная подсветка, оформление баннерами. Входная группа шиномонтажа Pirelli в Сургуте.",
    short_description: "Входная группа Pirelli",
    category_label: "Наружная реклама",
    client_name: "Pirelli",
    industry: "Автосервис",
    location: "Сургут",
    year: 2024,
    cover_url: "/port/2.png",
    images: ["/port/2.png"],
    is_featured: true,
    is_published: true,
    sort_order: 60,
  },
  {
    id: 7,
    title: "Выставочная стена, логотип и стенды",
    slug: "exhibition-wall",
    description:
      "Возведение и оклейка стены, установка логотипа, установка стендов для внутреннего оформления.",
    short_description: "Выставочная стена",
    category_label: "Наружная реклама",
    client_name: "ЮКИОР",
    industry: "Госструктуры",
    location: "Ханты-Мансийск",
    year: 2023,
    cover_url: "/port/66.png",
    images: ["/port/66.png"],
    is_featured: true,
    is_published: true,
    sort_order: 70,
  },
];

/**
 * Хелпер — вернуть только опубликованные работы, отсортированные по sort_order.
 */
export function getPublishedPortfolioStub(): PortfolioStub[] {
  return PORTFOLIO_STUB.filter((p) => p.is_published).sort(
    (a, b) => a.sort_order - b.sort_order,
  );
}

/**
 * Приведение стаба к типу `PortfolioItem` из БД (для совместимости с компонентами,
 * которые будут работать с реальной таблицей). Заполняет обязательные nullable
 * поля значениями по умолчанию.
 */
export function toPortfolioItemShape(stub: PortfolioStub): PortfolioItem {
  return {
    id: stub.id,
    title: stub.title,
    slug: stub.slug,
    description: stub.description,
    short_description: stub.short_description,
    category_id: null,
    related_product_id: null,
    client_name: stub.client_name,
    industry: stub.industry,
    location: stub.location,
    year: stub.year,
    project_date: null,
    cover_url: stub.cover_url,
    images: stub.images,
    video_url: null,
    is_featured: stub.is_featured,
    is_published: stub.is_published,
    sort_order: stub.sort_order,
    seo_title: null,
    seo_description: null,
    views_count: 0,
    search_vector: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
