/**
 * Demo-данные каталога для Этапа 2.
 *
 * Используются trySupabase() как fallback, когда Supabase не сконфигурирован
 * или RPC вернула ошибку. Состав ориентирован на seed.sql, но без необходимости
 * реальной БД: позволяет рендерить /catalog и /product/[slug] полностью.
 */

import type {
  CalculatorConfig,
  CalculatorFormula,
  CategoryTreeItem,
  ProductFacets,
  ProductParameter,
  ProductWithRelations,
} from "@/types";
import type { ProductPricingMode } from "@/types/database";

/**
 * Local copies of types from catalog.ts to avoid a cyclic runtime dependency.
 * catalog.ts depends on this module at runtime; this module only needs the
 * shape of those types.
 */
export interface CatalogListItem {
  id: number;
  category_id: number | null;
  name: string;
  slug: string;
  short_description: string | null;
  pricing_mode: ProductPricingMode;
  price: number;
  /** Верхняя граница диапазона; NULL — рендерим только «от {price}». */
  price_to: number | null;
  unit: string | null;
  is_featured: boolean;
  is_new: boolean;
  has_installation: boolean;
  rating_avg: number;
  reviews_count: number;
  image_url: string | null;
  category_slug: string | null;
  category_name: string | null;
  total_count: number;
}

export interface PriceCalculationResult {
  success: boolean;
  product_id?: number;
  product_name?: string;
  base_price?: number;
  total?: number;
  min_price?: number;
  currency?: string;
  breakdown?: Array<{ label: string; value: string | number; price_delta: number }>;
  notes?: string | null;
  error?: string;
}

const NOW = "2026-04-01T00:00:00Z";

const IMG_POLY =
  "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80";
const IMG_BANNER =
  "https://images.unsplash.com/photo-1563906267088-b029e7101114?auto=format&fit=crop&w=1200&q=80";
const IMG_SIGN =
  "https://images.unsplash.com/photo-1523437113738-bbd3cc89fb19?auto=format&fit=crop&w=1200&q=80";
const IMG_LETTERS =
  "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=80";
const IMG_STELA =
  "https://images.unsplash.com/photo-1464938050520-ef2270bb8ce8?auto=format&fit=crop&w=1200&q=80";
const IMG_FACADE =
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1200&q=80";

// ============================================================
// Categories tree
// ============================================================
export const DEMO_CATEGORY_TREE: CategoryTreeItem[] = [
  {
    id: 1,
    parent_id: null,
    name: "Полиграфия",
    slug: "polygrafiya",
    description: "Визитки, листовки, каталоги, буклеты, журналы",
    icon: "printer",
    image_url: null,
    is_featured: true,
    sort_order: 10,
    products_count: 9,
    depth: 0,
  },
  {
    id: 2,
    parent_id: null,
    name: "Наружная реклама",
    slug: "naruzhnaya-reklama",
    description: "Баннеры, таблички, стенды, дорожные знаки",
    icon: "megaphone",
    image_url: null,
    is_featured: true,
    sort_order: 20,
    products_count: 5,
    depth: 0,
  },
  {
    id: 3,
    parent_id: null,
    name: "Вывески",
    slug: "vyveski",
    description: "Лайтбоксы, световые короба, крышные вывески",
    icon: "panels-top-left",
    image_url: null,
    is_featured: true,
    sort_order: 30,
    products_count: 4,
    depth: 0,
  },
  {
    id: 4,
    parent_id: null,
    name: "Световые буквы",
    slug: "svetovye-bukvy",
    description: "Объёмные световые буквы, от 150 ₽/см",
    icon: "lightbulb",
    image_url: null,
    is_featured: true,
    sort_order: 40,
    products_count: 3,
    depth: 0,
  },
  {
    id: 5,
    parent_id: null,
    name: "Стелы",
    slug: "stely",
    description: "Пилоны АЗС, стелы ЖК, навигационные стелы",
    icon: "flag",
    image_url: null,
    is_featured: true,
    sort_order: 50,
    products_count: 3,
    depth: 0,
  },
  {
    id: 6,
    parent_id: null,
    name: "Оформление",
    slug: "oformlenie",
    description: "Навигация, таблички, аппликация, оклейка транспорта",
    icon: "sparkles",
    image_url: null,
    is_featured: true,
    sort_order: 60,
    products_count: 3,
    depth: 0,
  },
  {
    id: 7,
    parent_id: null,
    name: "Фасады",
    slug: "fasady",
    description: "Вентфасады, подсветка, входные группы",
    icon: "building-2",
    image_url: null,
    is_featured: true,
    sort_order: 70,
    products_count: 2,
    depth: 0,
  },
];

// ============================================================
// Products list
// ============================================================
type SeedProduct = {
  id: number;
  name: string;
  slug: string;
  category_id: number;
  category_slug: string;
  category_name: string;
  short_description: string;
  pricing_mode: ProductPricingMode;
  price: number;
  /** Верхняя граница диапазона; null — показывать только «от {price}». */
  price_to: number | null;
  unit: string;
  is_featured: boolean;
  is_new: boolean;
  has_installation: boolean;
  image_url: string;
};

const SEED: SeedProduct[] = [
  // === ПОЛИГРАФИЯ ===
  {
    id: 101,
    name: "Визитки 90×50 мм",
    slug: "vizitki-90x50",
    category_id: 1,
    category_slug: "polygrafiya",
    category_name: "Полиграфия",
    short_description:
      "Офсетная печать визиток от 1 000 шт. Бумага 300 г/м², полноцвет с двух сторон.",
    pricing_mode: "calculator",
    price: 1700,
    price_to: null,
    unit: "тираж",
    is_featured: true,
    is_new: true,
    has_installation: false,
    image_url: IMG_POLY,
  },
  {
    id: 102,
    name: "Визитки на дизайнерской бумаге",
    slug: "vizitki-designer-paper",
    category_id: 1,
    category_slug: "polygrafiya",
    category_name: "Полиграфия",
    short_description:
      "Премиум-визитки на бумаге до 640 г/м². Тиснение, скругление, ламинация.",
    pricing_mode: "quote",
    price: 6500,
    price_to: null,
    unit: "тираж",
    is_featured: false,
    is_new: false,
    has_installation: false,
    image_url: IMG_POLY,
  },
  {
    id: 103,
    name: "Листовки А5",
    slug: "listovki-a5",
    category_id: 1,
    category_slug: "polygrafiya",
    category_name: "Полиграфия",
    short_description:
      "Печать листовок А5 (148×210 мм) от 500 шт. Бумага 130 г/м², полноцвет 4+4.",
    pricing_mode: "calculator",
    price: 4900,
    price_to: null,
    unit: "тираж",
    is_featured: true,
    is_new: false,
    has_installation: false,
    image_url: IMG_POLY,
  },
  {
    id: 104,
    name: "Листовки А4",
    slug: "listovki-a4",
    category_id: 1,
    category_slug: "polygrafiya",
    category_name: "Полиграфия",
    short_description:
      "Печать листовок А4 от 250 шт. Бумага 130-170 г/м², полноцвет 4+4.",
    pricing_mode: "calculator",
    price: 7900,
    price_to: null,
    unit: "тираж",
    is_featured: false,
    is_new: false,
    has_installation: false,
    image_url: IMG_POLY,
  },
  {
    id: 105,
    name: "Буклеты-евро",
    slug: "buklety-evro",
    category_id: 1,
    category_slug: "polygrafiya",
    category_name: "Полиграфия",
    short_description:
      "Буклеты евро (А4 в 3 фальца). Бумага 170 г/м², полноцвет, биговка.",
    pricing_mode: "calculator",
    price: 9500,
    price_to: null,
    unit: "тираж",
    is_featured: false,
    is_new: false,
    has_installation: false,
    image_url: IMG_POLY,
  },
  {
    id: 106,
    name: "Каталог на скрепке А4",
    slug: "katalog-skrepka-a4",
    category_id: 1,
    category_slug: "polygrafiya",
    category_name: "Полиграфия",
    short_description:
      "Каталог А4 до 48 полос, крепление на скрепку. Офсет, обложка 300 г/м².",
    pricing_mode: "quote",
    price: 35000,
    price_to: null,
    unit: "тираж",
    is_featured: false,
    is_new: false,
    has_installation: false,
    image_url: IMG_POLY,
  },
  {
    id: 107,
    name: "Журнал КБС",
    slug: "zhurnal-kbs",
    category_id: 1,
    category_slug: "polygrafiya",
    category_name: "Полиграфия",
    short_description:
      "Журнал клеевым бесшвейным способом, от 64 полос. Офсетная печать.",
    pricing_mode: "quote",
    price: 80000,
    price_to: null,
    unit: "тираж",
    is_featured: false,
    is_new: false,
    has_installation: false,
    image_url: IMG_POLY,
  },
  {
    id: 108,
    name: "Блокноты с логотипом",
    slug: "bloknoty-logo",
    category_id: 1,
    category_slug: "polygrafiya",
    category_name: "Полиграфия",
    short_description:
      "Брендированные блокноты А5/А6 с логотипом. Пружина или скрепка.",
    pricing_mode: "quote",
    price: 15000,
    price_to: null,
    unit: "тираж",
    is_featured: false,
    is_new: false,
    has_installation: false,
    image_url: IMG_POLY,
  },
  {
    id: 109,
    name: "Нанесение логотипа на сувенирку",
    slug: "logo-na-suvenirku",
    category_id: 1,
    category_slug: "polygrafiya",
    category_name: "Полиграфия",
    short_description:
      "УФ-печать, тиснение, тампо- и шелкография на ручках, кружках, флешках.",
    pricing_mode: "quote",
    price: 5000,
    price_to: null,
    unit: "заказ",
    is_featured: false,
    is_new: false,
    has_installation: false,
    image_url: IMG_POLY,
  },

  // === НАРУЖНАЯ РЕКЛАМА ===
  {
    id: 201,
    name: "Баннер уличный",
    slug: "banner-ulichny",
    category_id: 2,
    category_slug: "naruzhnaya-reklama",
    category_name: "Наружная реклама",
    short_description:
      "Баннер на ПВХ 440 г/м². Печать экосольвентом, люверсы по периметру.",
    pricing_mode: "calculator",
    price: 550,
    price_to: null,
    unit: "м²",
    is_featured: true,
    is_new: false,
    has_installation: true,
    image_url: IMG_BANNER,
  },
  {
    id: 202,
    name: "Баннер интерьерный",
    slug: "banner-interierny",
    category_id: 2,
    category_slug: "naruzhnaya-reklama",
    category_name: "Наружная реклама",
    short_description:
      "Интерьерный баннер на бэклите. Латексная печать, без запаха.",
    pricing_mode: "calculator",
    price: 750,
    price_to: null,
    unit: "м²",
    is_featured: false,
    is_new: false,
    has_installation: false,
    image_url: IMG_BANNER,
  },
  {
    id: 203,
    name: "Табличка офисная",
    slug: "tablichka-ofisnaya",
    category_id: 2,
    category_slug: "naruzhnaya-reklama",
    category_name: "Наружная реклама",
    short_description:
      "Табличка из АКП или акрила. Фрезеровка, УФ-печать, аппликация плёнкой.",
    pricing_mode: "calculator",
    price: 2500,
    price_to: null,
    unit: "шт",
    is_featured: false,
    is_new: false,
    has_installation: false,
    image_url: IMG_SIGN,
  },
  {
    id: 204,
    name: "Дорожный знак",
    slug: "dorozhny-znak",
    category_id: 2,
    category_slug: "naruzhnaya-reklama",
    category_name: "Наружная реклама",
    short_description:
      "Дорожные знаки по ГОСТ Р 52290-2004. Типоразмеры I–IV, световозвращающая плёнка.",
    pricing_mode: "quote",
    price: 3500,
    price_to: null,
    unit: "шт",
    is_featured: false,
    is_new: false,
    has_installation: true,
    image_url: IMG_SIGN,
  },
  {
    id: 205,
    name: "Стенд информационный",
    slug: "stend-informatsionny",
    category_id: 2,
    category_slug: "naruzhnaya-reklama",
    category_name: "Наружная реклама",
    short_description:
      "Стенды для школ, офисов, госучреждений. АКП + карманы А4.",
    pricing_mode: "quote",
    price: 6500,
    price_to: null,
    unit: "шт",
    is_featured: false,
    is_new: false,
    has_installation: false,
    image_url: IMG_SIGN,
  },

  // === ВЫВЕСКИ ===
  {
    id: 301,
    name: "Лайтбокс односторонний",
    slug: "laytboks-odnostoronny",
    category_id: 3,
    category_slug: "vyveski",
    category_name: "Вывески",
    short_description:
      "Лайтбокс односторонний на фасад. Светодиодная подсветка, корпус алюминий.",
    pricing_mode: "calculator",
    price: 12000,
    price_to: null,
    unit: "м²",
    is_featured: true,
    is_new: false,
    has_installation: true,
    image_url: IMG_SIGN,
  },
  {
    id: 302,
    name: "Лайтбокс двусторонний",
    slug: "laytboks-dvustoronny",
    category_id: 3,
    category_slug: "vyveski",
    category_name: "Вывески",
    short_description:
      "Двусторонний короб для входных групп. LED-модули, транслюцентный баннер.",
    pricing_mode: "calculator",
    price: 18000,
    price_to: null,
    unit: "м²",
    is_featured: false,
    is_new: false,
    has_installation: true,
    image_url: IMG_SIGN,
  },
  {
    id: 303,
    name: "Крышная вывеска",
    slug: "kryshnaya-vyveska",
    category_id: 3,
    category_slug: "vyveski",
    category_name: "Вывески",
    short_description:
      "Вывеска на крышу здания под ключ: металлокаркас, буквы, монтаж.",
    pricing_mode: "quote",
    price: 200000,
    price_to: null,
    unit: "объект",
    is_featured: true,
    is_new: false,
    has_installation: true,
    image_url: IMG_SIGN,
  },
  {
    id: 304,
    name: "Псевдообъёмные буквы",
    slug: "psevdoobyomnye-bukvy",
    category_id: 3,
    category_slug: "vyveski",
    category_name: "Вывески",
    short_description:
      "Буквы из композита или ПВХ. Аппликация плёнкой, без подсветки.",
    pricing_mode: "calculator",
    price: 95,
    price_to: null,
    unit: "см",
    is_featured: false,
    is_new: false,
    has_installation: true,
    image_url: IMG_LETTERS,
  },

  // === СВЕТОВЫЕ БУКВЫ ===
  {
    id: 401,
    name: "Световые буквы открытые",
    slug: "svetovye-bukvy-otkrytye",
    category_id: 4,
    category_slug: "svetovye-bukvy",
    category_name: "Световые буквы",
    short_description:
      "Объёмные буквы с открытым светодиодом. Эффектны ночью, гарантия 3 года.",
    pricing_mode: "calculator",
    price: 180,
    price_to: null,
    unit: "см",
    is_featured: true,
    is_new: false,
    has_installation: true,
    image_url: IMG_LETTERS,
  },
  {
    id: 402,
    name: "Световые буквы закрытые",
    slug: "svetovye-bukvy-zakrytye",
    category_id: 4,
    category_slug: "svetovye-bukvy",
    category_name: "Световые буквы",
    short_description:
      "Объёмные буквы с лицом из акрила и внутренней LED-подсветкой.",
    pricing_mode: "calculator",
    price: 220,
    price_to: null,
    unit: "см",
    is_featured: false,
    is_new: false,
    has_installation: true,
    image_url: IMG_LETTERS,
  },
  {
    id: 403,
    name: "Контражурные буквы",
    slug: "kontrazhurnye-bukvy",
    category_id: 4,
    category_slug: "svetovye-bukvy",
    category_name: "Световые буквы",
    short_description:
      "Буквы с обратным свечением на стену. Премиальный вид, эффект нимба.",
    pricing_mode: "calculator",
    price: 260,
    price_to: null,
    unit: "см",
    is_featured: false,
    is_new: true,
    has_installation: true,
    image_url: IMG_LETTERS,
  },

  // === СТЕЛЫ ===
  {
    id: 501,
    name: "Стела АЗС",
    slug: "stela-azs",
    category_id: 5,
    category_slug: "stely",
    category_name: "Стелы",
    short_description:
      "Пилон-стела АЗС с ценниками. Металлокаркас, композит, светодиодные модули.",
    pricing_mode: "quote",
    price: 350000,
    price_to: null,
    unit: "объект",
    is_featured: true,
    is_new: false,
    has_installation: true,
    image_url: IMG_STELA,
  },
  {
    id: 502,
    name: "Навигационная стела",
    slug: "navigatsionnaya-stela",
    category_id: 5,
    category_slug: "stely",
    category_name: "Стелы",
    short_description:
      "Стела-указатель для ЖК, офисных центров, промзон. Композит + стальной каркас.",
    pricing_mode: "quote",
    price: 180000,
    price_to: null,
    unit: "объект",
    is_featured: false,
    is_new: false,
    has_installation: true,
    image_url: IMG_STELA,
  },
  {
    id: 503,
    name: "Реставрация стелы",
    slug: "restavratsiya-stely",
    category_id: 5,
    category_slug: "stely",
    category_name: "Стелы",
    short_description:
      "Реставрация существующих стел и рекламных конструкций под ключ.",
    pricing_mode: "quote",
    price: 60000,
    price_to: null,
    unit: "объект",
    is_featured: false,
    is_new: false,
    has_installation: true,
    image_url: IMG_STELA,
  },

  // === ОФОРМЛЕНИЕ ===
  {
    id: 601,
    name: "Аппликация на стекло",
    slug: "applikatsiya-na-steklo",
    category_id: 6,
    category_slug: "oformlenie",
    category_name: "Оформление",
    short_description:
      "Плоттерная резка цветных плёнок. Оформление витрин и офисов.",
    pricing_mode: "calculator",
    price: 1100,
    price_to: null,
    unit: "м²",
    is_featured: false,
    is_new: false,
    has_installation: true,
    image_url: IMG_FACADE,
  },
  {
    id: 602,
    name: "Оклейка транспорта",
    slug: "okleyka-transporta",
    category_id: 6,
    category_slug: "oformlenie",
    category_name: "Оформление",
    short_description:
      "Брендирование автомобилей, автобусов, такси. Полная и частичная оклейка.",
    pricing_mode: "quote",
    price: 25000,
    price_to: null,
    unit: "объект",
    is_featured: false,
    is_new: false,
    has_installation: true,
    image_url: IMG_FACADE,
  },
  {
    id: 603,
    name: "Новогоднее оформление",
    slug: "novogodnee-oformlenie",
    category_id: 6,
    category_slug: "oformlenie",
    category_name: "Оформление",
    short_description:
      "Световые фигуры, гирлянды, декоративные конструкции для городской среды.",
    pricing_mode: "quote",
    price: 50000,
    price_to: null,
    unit: "объект",
    is_featured: true,
    is_new: true,
    has_installation: true,
    image_url: IMG_FACADE,
  },

  // === ФАСАДЫ ===
  {
    id: 701,
    name: "Вентилируемый фасад",
    slug: "ventfasad",
    category_id: 7,
    category_slug: "fasady",
    category_name: "Фасады",
    short_description:
      "Комплексная система вентфасада: каркас, утеплитель, композит или керамогранит.",
    pricing_mode: "quote",
    price: 4500,
    price_to: null,
    unit: "м²",
    is_featured: false,
    is_new: false,
    has_installation: true,
    image_url: IMG_FACADE,
  },
  {
    id: 702,
    name: "Архитектурная подсветка",
    slug: "arkhitekturnaya-podsvetka",
    category_id: 7,
    category_slug: "fasady",
    category_name: "Фасады",
    short_description:
      "Контурная и архитектурная подсветка зданий. Проект, монтаж, пусконаладка.",
    pricing_mode: "quote",
    price: 150000,
    price_to: null,
    unit: "объект",
    is_featured: true,
    is_new: false,
    has_installation: true,
    image_url: IMG_FACADE,
  },
];

export const DEMO_LIST_PRODUCTS: CatalogListItem[] = SEED.map((p) => ({
  id: p.id,
  category_id: p.category_id,
  name: p.name,
  slug: p.slug,
  short_description: p.short_description,
  pricing_mode: p.pricing_mode,
  price: p.price,
  price_to: p.price_to,
  unit: p.unit,
  is_featured: p.is_featured,
  is_new: p.is_new,
  has_installation: p.has_installation,
  rating_avg: 4.9,
  reviews_count: 7,
  image_url: p.image_url,
  category_slug: p.category_slug,
  category_name: p.category_name,
  total_count: 0,
}));

// ============================================================
// Facets
// ============================================================
export const DEMO_FACETS: ProductFacets = {
  price_range: { min: 95, max: 350000 },
  pricing_modes: [
    { value: "calculator", count: 13 },
    { value: "quote", count: 15 },
    { value: "fixed", count: 0 },
  ],
  brands: [],
  tags: [
    { value: "полиграфия", count: 9 },
    { value: "вывески", count: 4 },
    { value: "световые буквы", count: 3 },
    { value: "стелы", count: 3 },
    { value: "фасады", count: 2 },
  ],
  has_installation: 17,
  is_new: 3,
  is_on_sale: 0,
  total_count: SEED.length,
};

// ============================================================
// Filtering/sorting for demo fallback
// ============================================================
export function filterDemoList(
  rows: CatalogListItem[],
  params: {
    categorySlug: string | null;
    pricingMode: ProductPricingMode | null;
    priceMin: number | null;
    priceMax: number | null;
    search: string | null;
    sort: string;
  },
): CatalogListItem[] {
  let out = rows.slice();
  if (params.categorySlug)
    out = out.filter((p) => p.category_slug === params.categorySlug);
  if (params.pricingMode)
    out = out.filter((p) => p.pricing_mode === params.pricingMode);
  if (params.priceMin != null)
    out = out.filter((p) => p.price >= (params.priceMin as number));
  if (params.priceMax != null)
    out = out.filter((p) => p.price <= (params.priceMax as number));
  if (params.search) {
    const q = params.search.toLowerCase();
    out = out.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.short_description ?? "").toLowerCase().includes(q),
    );
  }

  switch (params.sort) {
    case "price_asc":
      out.sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      out.sort((a, b) => b.price - a.price);
      break;
    case "newest":
      out.sort((a, b) => Number(b.is_new) - Number(a.is_new) || a.id - b.id);
      break;
    case "popular":
    default:
      out.sort(
        (a, b) => Number(b.is_featured) - Number(a.is_featured) || a.id - b.id,
      );
  }
  return out;
}

// ============================================================
// Product details (для /product/[slug])
// ============================================================
const CALC_CFG_TIRAJ_VIZITKI: CalculatorConfig = {
  id: 1001,
  product_id: 101,
  formula: {
    type: "per_tiraj_tier",
    unit_price: 1.7,
    min_price: 1700,
    tiers: [
      { from: 1000, price: 1700 },
      { from: 2000, price: 2900 },
      { from: 5000, price: 6500 },
      { from: 10000, price: 12000 },
    ],
  } as CalculatorFormula,
  fields: [{ key: "tiraj", label: "Тираж", type: "radio" }],
  min_price: 1700,
  max_price: null,
  currency: "RUB",
  notes: "При заказе 500 шт — ещё 500 визиток в подарок.",
  is_active: true,
  created_at: NOW,
  updated_at: NOW,
};

const CALC_CFG_BANNER: CalculatorConfig = {
  id: 1002,
  product_id: 201,
  formula: {
    type: "per_area",
    unit_price: 550,
    min_price: 1500,
  } as CalculatorFormula,
  fields: [
    { key: "width", label: "Ширина, м", type: "number", min: 0.5, max: 20, step: 0.1, default: 3 },
    { key: "height", label: "Высота, м", type: "number", min: 0.5, max: 10, step: 0.1, default: 2 },
  ],
  min_price: 1500,
  max_price: null,
  currency: "RUB",
  notes: "Цена указана без учёта монтажа. Монтаж рассчитывается отдельно.",
  is_active: true,
  created_at: NOW,
  updated_at: NOW,
};

const CALC_CFG_LETTERS: CalculatorConfig = {
  id: 1003,
  product_id: 401,
  formula: {
    type: "per_length",
    unit_price: 180,
    min_price: 18000,
  } as CalculatorFormula,
  fields: [
    {
      key: "letter_height",
      label: "Высота буквы, см",
      type: "number",
      min: 10,
      max: 200,
      step: 1,
      default: 50,
    },
    {
      key: "letters_count",
      label: "Количество букв",
      type: "number",
      min: 1,
      max: 50,
      step: 1,
      default: 10,
    },
  ],
  min_price: 18000,
  max_price: null,
  currency: "RUB",
  notes: "Срок изготовления 7-10 рабочих дней. Гарантия 3 года.",
  is_active: true,
  created_at: NOW,
  updated_at: NOW,
};

const PARAMS_VIZITKI: ProductParameter[] = [
  {
    id: 10,
    product_id: 101,
    key: "paper",
    label: "Бумага",
    type: "select",
    options: [
      { value: "matte_300", label: "Матовая 300 г/м²" },
      { value: "glossy_300", label: "Глянцевая 300 г/м²", price_modifier: 0.05 },
      { value: "textured_350", label: "Фактурная 350 г/м²", price_modifier: 0.2 },
    ],
    unit: null,
    default_value: "matte_300",
    min_value: null,
    max_value: null,
    step: null,
    required: true,
    affects_price: true,
    sort_order: 1,
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: 11,
    product_id: 101,
    key: "corners",
    label: "Скругление углов",
    type: "select",
    options: [
      { value: "no", label: "Нет" },
      { value: "yes", label: "Да", price_modifier: 0.1 },
    ],
    unit: null,
    default_value: "no",
    min_value: null,
    max_value: null,
    step: null,
    required: false,
    affects_price: true,
    sort_order: 2,
    created_at: NOW,
    updated_at: NOW,
  },
];

function makeProductDetails(seed: SeedProduct, opts?: {
  description?: string;
  calculator?: CalculatorConfig | null;
  parameters?: ProductParameter[];
}): ProductWithRelations {
  return {
    id: seed.id,
    category_id: seed.category_id,
    name: seed.name,
    slug: seed.slug,
    description:
      opts?.description ??
      `${seed.short_description}\n\nРекламная компания «2х2» — производство и монтаж в Ханты-Мансийске и по всему ХМАО-Югре.`,
    short_description: seed.short_description,
    sku: `SKU-${seed.id}`,
    barcode: null,
    pricing_mode: seed.pricing_mode,
    price: seed.price,
    old_price: null,
    cost_price: null,
    price_to: seed.price_to,
    unit: seed.unit,
    stock: 999,
    track_stock: false,
    weight: null,
    dimensions: null,
    brand: null,
    status: "active",
    is_featured: seed.is_featured,
    is_new: seed.is_new,
    is_on_sale: false,
    has_installation: seed.has_installation,
    lead_time_days: 2,
    attributes: {},
    tags: [],
    seo_title: null,
    seo_description: null,
    seo_keywords: null,
    sort_order: seed.id,
    views_count: 120,
    rating_avg: 4.9,
    reviews_count: 7,
    search_vector: null,
    created_at: NOW,
    updated_at: NOW,
    deleted_at: null,
    category: {
      id: seed.category_id,
      parent_id: null,
      name: seed.category_name,
      slug: seed.category_slug,
      description: null,
      icon: null,
      image_url: null,
      cover_url: null,
      is_active: true,
      is_featured: true,
      sort_order: 0,
      seo_title: null,
      seo_description: null,
      seo_keywords: null,
      created_at: NOW,
      updated_at: NOW,
    },
    images: [
      {
        id: seed.id * 10 + 1,
        product_id: seed.id,
        url: seed.image_url,
        alt_text: seed.name,
        sort_order: 0,
        is_primary: true,
        created_at: NOW,
      },
      {
        id: seed.id * 10 + 2,
        product_id: seed.id,
        url: seed.image_url.replace("w=1200", "w=1400"),
        alt_text: `${seed.name} — пример работы`,
        sort_order: 1,
        is_primary: false,
        created_at: NOW,
      },
    ],
    variants: [],
    parameters: opts?.parameters ?? [],
    calculator: opts?.calculator ?? null,
  } as ProductWithRelations;
}

export const DEMO_PRODUCT_DETAILS: Record<string, ProductWithRelations> = Object.fromEntries(
  SEED.map((seed) => {
    const opts: Parameters<typeof makeProductDetails>[1] = {};
    if (seed.slug === "vizitki-90x50") {
      opts.calculator = CALC_CFG_TIRAJ_VIZITKI;
      opts.parameters = PARAMS_VIZITKI;
    } else if (seed.slug === "banner-ulichny") {
      opts.calculator = CALC_CFG_BANNER;
    } else if (seed.slug === "svetovye-bukvy-otkrytye") {
      opts.calculator = CALC_CFG_LETTERS;
    }
    return [seed.slug, makeProductDetails(seed, opts)];
  }),
);

// ============================================================
// Demo price calculator (для fallback)
// ============================================================
export function calculateDemoPrice(
  productId: number,
  params: Record<string, string | number | boolean>,
): PriceCalculationResult {
  const seed = SEED.find((p) => p.id === productId);
  if (!seed) {
    return { success: false, error: "Product not found" };
  }

  const entry = Object.values(DEMO_PRODUCT_DETAILS).find(
    (p) => p.id === productId,
  );
  const calc = entry?.calculator;

  if (!calc) {
    return {
      success: true,
      product_id: productId,
      product_name: seed.name,
      base_price: seed.price,
      total: seed.price,
      min_price: seed.price,
      currency: "RUB",
      breakdown: [
        { label: "Базовая стоимость", value: "", price_delta: seed.price },
      ],
      notes: "Фиксированная цена товара",
    };
  }

  const formula = calc.formula;
  const basePrice =
    "unit_price" in formula ? Number(formula.unit_price) : seed.price;
  const minPrice = calc.min_price ?? 0;

  let total = basePrice;
  const breakdown: PriceCalculationResult["breakdown"] = [];

  if (formula.type === "per_unit") {
    const qty = Number(params.quantity ?? params.qty ?? 1);
    total = basePrice * qty;
    breakdown.push({ label: "Количество", value: `${qty} шт`, price_delta: total });
  } else if (formula.type === "per_area") {
    const w = Number(params.width ?? 1);
    const h = Number(params.height ?? 1);
    const area = w * h;
    total = basePrice * area;
    breakdown.push({
      label: "Площадь",
      value: `${area.toFixed(2)} м² (${w}×${h})`,
      price_delta: Math.round(total),
    });
  } else if (formula.type === "per_length") {
    const lh = Number(params.letter_height ?? 50);
    const lc = Number(params.letters_count ?? 1);
    const perim = lh * lc;
    total = basePrice * perim;
    breakdown.push({
      label: "Периметр",
      value: `${perim} см × ${basePrice} ₽`,
      price_delta: Math.round(total),
    });
  } else if (formula.type === "per_tiraj_tier") {
    const qty = Number(params.tiraj ?? params.quantity ?? 1000);
    const tiers = formula.tiers ?? [];
    let matched = tiers.find((t) => t.from >= qty);
    if (!matched && tiers.length) matched = tiers[tiers.length - 1];
    if (matched) {
      total = matched.price;
      breakdown.push({
        label: "Тираж",
        value: `${matched.from} шт`,
        price_delta: matched.price,
      });
    }
  }

  // Apply option modifiers
  if (entry?.parameters?.length) {
    for (const p of entry.parameters) {
      if (!p.affects_price || !p.options) continue;
      const selected = params[p.key];
      if (selected == null) continue;
      const opt = p.options.find((o) => String(o.value) === String(selected));
      const mod = opt?.price_modifier;
      if (mod) {
        const delta = total * Number(mod);
        total += delta;
        breakdown.push({
          label: p.label,
          value: opt?.label ?? String(selected),
          price_delta: Math.round(delta),
        });
      }
    }
  }

  if (total < minPrice) total = minPrice;

  return {
    success: true,
    product_id: productId,
    product_name: seed.name,
    base_price: basePrice,
    total: Math.round(total),
    min_price: minPrice,
    currency: "RUB",
    breakdown,
    notes: calc.notes ?? null,
  };
}
