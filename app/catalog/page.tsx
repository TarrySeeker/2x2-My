import type { Metadata } from "next";
import {
  listProducts,
  getCategoryTree,
  getProductFacets,
  type ListProductsParams,
} from "@/lib/data/catalog";
import type { ProductPricingMode } from "@/types/database";
import type { ProductSort } from "@/types";
import Breadcrumbs from "@/components/shop/catalog/Breadcrumbs";
import CategoryChips from "@/components/shop/catalog/CategoryChips";
import FilterSidebar from "@/components/shop/catalog/FilterSidebar";
import CatalogMobileFilters from "@/components/shop/catalog/CatalogMobileFilters";
import CatalogGrid from "@/components/shop/catalog/CatalogGrid";
import CatalogEmpty from "@/components/shop/catalog/CatalogEmpty";
import CatalogPagination from "@/components/shop/catalog/CatalogPagination";

export const metadata: Metadata = {
  title: "Каталог услуг — полиграфия, вывески, наружная реклама",
  description:
    "Полный каталог услуг рекламной компании «2х2»: визитки, листовки, вывески, световые буквы, стелы, наружная реклама в Ханты-Мансийске и Сургуте. Стартовые цены и онлайн-калькулятор.",
  alternates: { canonical: "/catalog" },
};

type SearchParams = {
  category?: string;
  sort?: string;
  page?: string;
  price_min?: string;
  price_max?: string;
  pricing_mode?: string;
  has_installation?: string;
  is_new?: string;
  is_on_sale?: string;
  q?: string;
};

const ALLOWED_SORTS: ProductSort[] = [
  "popular",
  "newest",
  "price_asc",
  "price_desc",
  "rating",
  "featured",
];

const ALLOWED_MODES: ProductPricingMode[] = ["fixed", "calculator", "quote"];

function parseSearchParams(sp: SearchParams): ListProductsParams & {
  rawSort: ProductSort;
  rawPage: number;
} {
  const sortRaw = (sp.sort ?? "popular") as ProductSort;
  const rawSort = ALLOWED_SORTS.includes(sortRaw) ? sortRaw : "popular";
  const pageNum = Number(sp.page ?? "1");
  const rawPage = Number.isFinite(pageNum) && pageNum > 0 ? Math.floor(pageNum) : 1;
  const pricingMode =
    sp.pricing_mode && ALLOWED_MODES.includes(sp.pricing_mode as ProductPricingMode)
      ? (sp.pricing_mode as ProductPricingMode)
      : null;
  const priceMinNum = Number(sp.price_min);
  const priceMaxNum = Number(sp.price_max);
  return {
    categorySlug: sp.category ?? null,
    sort: rawSort,
    page: rawPage,
    perPage: 24,
    pricingMode,
    priceMin: Number.isFinite(priceMinNum) && sp.price_min ? priceMinNum : null,
    priceMax: Number.isFinite(priceMaxNum) && sp.price_max ? priceMaxNum : null,
    search: sp.q ?? null,
    rawSort,
    rawPage,
  };
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const parsed = parseSearchParams(sp);

  const [list, categories, facets] = await Promise.all([
    listProducts(parsed),
    getCategoryTree(),
    getProductFacets({ search: parsed.search ?? null }),
  ]);

  const activeCategory = categories.find((c) => c.slug === parsed.categorySlug);

  return (
    <main className="bg-surface-cream">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-10 md:px-8 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Главная", href: "/" },
            { label: "Каталог", href: "/catalog" },
            ...(activeCategory
              ? [{ label: activeCategory.name, href: `/catalog/${activeCategory.slug}` }]
              : []),
          ]}
        />

        <header className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-bold tracking-tight text-brand-dark md:text-5xl">
            {activeCategory?.name ?? "Все услуги"}
          </h1>
          <p className="max-w-3xl text-base text-neutral-600">
            {activeCategory?.description ??
              "Полиграфия, наружная реклама, вывески и оформление — от стартовой цены до индивидуального расчёта. Выберите услугу и получите КП за 1 час."}
          </p>
        </header>

        <CategoryChips
          categories={categories}
          activeSlug={parsed.categorySlug ?? null}
        />

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <FilterSidebar facets={facets} />
          </aside>

          <div className="flex flex-col gap-6">
            <CatalogMobileFilters
              total={list.total}
              currentSort={parsed.rawSort}
              facets={facets}
            />

            {list.items.length === 0 ? (
              <CatalogEmpty />
            ) : (
              <>
                <CatalogGrid products={list.items} />
                {list.pageCount > 1 && (
                  <CatalogPagination
                    page={list.page}
                    pageCount={list.pageCount}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
