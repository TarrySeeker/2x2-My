import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  listProducts,
  getCategoryTree,
  getProductFacets,
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

type SearchParams = {
  sort?: string;
  page?: string;
  price_min?: string;
  price_max?: string;
  pricing_mode?: string;
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const tree = await getCategoryTree();
  const cat = tree.find((c) => c.slug === category);
  if (!cat) return { title: "Категория не найдена" };
  const title = `${cat.name} — каталог услуг «2х2»`;
  const description =
    cat.description ??
    `${cat.name}: стартовые цены, онлайн-расчёт и примеры работ от рекламной компании «2х2» в Ханты-Мансийске.`;
  return {
    title,
    description,
    alternates: { canonical: `/catalog/${cat.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ category }, sp] = await Promise.all([params, searchParams]);

  const tree = await getCategoryTree();
  const activeCategory = tree.find((c) => c.slug === category);
  if (!activeCategory) notFound();

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

  const [list, facets] = await Promise.all([
    listProducts({
      categorySlug: category,
      sort: rawSort,
      page: rawPage,
      perPage: 24,
      pricingMode,
      priceMin: Number.isFinite(priceMinNum) && sp.price_min ? priceMinNum : null,
      priceMax: Number.isFinite(priceMaxNum) && sp.price_max ? priceMaxNum : null,
      search: sp.q ?? null,
    }),
    getProductFacets({
      categoryId: activeCategory.id,
      search: sp.q ?? null,
    }),
  ]);

  return (
    <main className="bg-surface-cream">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-10 md:px-8 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Главная", href: "/" },
            { label: "Каталог", href: "/catalog" },
            { label: activeCategory.name, href: `/catalog/${activeCategory.slug}` },
          ]}
        />

        <header className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-bold tracking-tight text-brand-dark md:text-5xl">
            {activeCategory.name}
          </h1>
          {activeCategory.description && (
            <p className="max-w-3xl text-base text-neutral-600">
              {activeCategory.description}
            </p>
          )}
        </header>

        <CategoryChips categories={tree} activeSlug={activeCategory.slug} />

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <FilterSidebar facets={facets} />
          </aside>

          <div className="flex flex-col gap-6">
            <CatalogMobileFilters
              total={list.total}
              currentSort={rawSort}
              facets={facets}
            />

            {list.items.length === 0 ? (
              <CatalogEmpty resetHref={`/catalog/${activeCategory.slug}`} />
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
