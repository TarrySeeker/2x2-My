import "server-only";

import { createClient } from "@/lib/supabase/server";
import { trySupabase } from "@/lib/data/try-supabase";
import type {
  CategoryTreeItem,
  Product,
  ProductFacets,
  ProductSort,
  ProductWithRelations,
} from "@/types";
import type { Database, ProductPricingMode } from "@/types/database";
import {
  DEMO_CATEGORY_TREE,
  DEMO_FACETS,
  DEMO_LIST_PRODUCTS,
  DEMO_PRODUCT_DETAILS,
  calculateDemoPrice,
  filterDemoList,
} from "./catalog-demo";
import type {
  CatalogListItem as CatalogListItemType,
  PriceCalculationResult as PriceCalculationResultType,
} from "./catalog-demo";

export type CatalogListItem = CatalogListItemType;
export type PriceCalculationResult = PriceCalculationResultType;

/**
 * Параметры для RPC list_products.
 * Совпадают с сигнатурой SQL-функции из миграции 00003_catalog_phase2.sql.
 */
export interface ListProductsParams {
  categorySlug?: string | null;
  pricingMode?: ProductPricingMode | null;
  priceMin?: number | null;
  priceMax?: number | null;
  search?: string | null;
  sort?: ProductSort;
  page?: number;
  perPage?: number;
}

export interface CatalogListResult {
  items: CatalogListItem[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
}

const DEFAULT_PER_PAGE = 24;

const normalizeSort = (sort?: ProductSort): string => {
  switch (sort) {
    case "price_asc":
    case "price_desc":
    case "newest":
      return sort;
    case "popular":
    case "featured":
    case "rating":
    default:
      return "popular";
  }
};

/**
 * RPC list_products + graceful demo-fallback.
 */
export async function listProducts(
  params: ListProductsParams = {},
): Promise<CatalogListResult> {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.max(1, Math.min(60, params.perPage ?? DEFAULT_PER_PAGE));
  const offset = (page - 1) * perPage;
  const sortKey = normalizeSort(params.sort);

  const fallback = (() => {
    const filtered = filterDemoList(DEMO_LIST_PRODUCTS, {
      categorySlug: params.categorySlug ?? null,
      pricingMode: params.pricingMode ?? null,
      priceMin: params.priceMin ?? null,
      priceMax: params.priceMax ?? null,
      search: params.search ?? null,
      sort: sortKey,
    });
    const total = filtered.length;
    const slice = filtered.slice(offset, offset + perPage).map((row) => ({
      ...row,
      total_count: total,
    }));
    return {
      items: slice,
      total,
      page,
      perPage,
      pageCount: Math.max(1, Math.ceil(total / perPage)),
    } satisfies CatalogListResult;
  })();

  return trySupabase(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("list_products", {
        p_category_slug: params.categorySlug ?? null,
        p_pricing_mode: params.pricingMode ?? null,
        p_price_min: params.priceMin ?? null,
        p_price_max: params.priceMax ?? null,
        p_search: params.search ?? null,
        p_sort: sortKey,
        p_limit: perPage,
        p_offset: offset,
      });
      if (error) throw error;
      const rows = (data ?? []) as CatalogListItem[];
      const total = rows[0]?.total_count ?? 0;
      return {
        items: rows,
        total: Number(total),
        page,
        perPage,
        pageCount: Math.max(1, Math.ceil(Number(total) / perPage)),
      } satisfies CatalogListResult;
    },
    fallback,
    "listProducts",
  );
}

/**
 * RPC get_category_tree + graceful demo-fallback.
 */
export async function getCategoryTree(): Promise<CategoryTreeItem[]> {
  return trySupabase(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("get_category_tree");
      if (error) throw error;
      return (data ?? []) as CategoryTreeItem[];
    },
    DEMO_CATEGORY_TREE,
    "getCategoryTree",
  );
}

/**
 * RPC get_product_facets + graceful demo-fallback.
 */
export async function getProductFacets(args: {
  categoryId?: number | null;
  search?: string | null;
} = {}): Promise<ProductFacets> {
  return trySupabase(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("get_product_facets", {
        p_category_id: args.categoryId ?? null,
        p_search: args.search ?? null,
      });
      if (error) throw error;
      return (data ?? DEMO_FACETS) as ProductFacets;
    },
    DEMO_FACETS,
    "getProductFacets",
  );
}

/**
 * Полное получение товара с картинками, параметрами и калькулятором.
 * Не RPC, а selectы — поэтому выполняем вручную.
 */
export async function getProductBySlugWithRelations(
  slug: string,
): Promise<ProductWithRelations | null> {
  const fallback = DEMO_PRODUCT_DETAILS[slug] ?? null;

  return trySupabase(
    async () => {
      const supabase = await createClient();

      const { data: product, error: productErr } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .eq("status", "active")
        .is("deleted_at", null)
        .maybeSingle();

      if (productErr) throw productErr;
      if (!product) return null;

      const [
        { data: category },
        { data: images },
        { data: variants },
        { data: parameters },
        { data: calculator },
      ] = await Promise.all([
        supabase
          .from("categories")
          .select("*")
          .eq("id", product.category_id ?? -1)
          .maybeSingle(),
        supabase
          .from("product_images")
          .select("*")
          .eq("product_id", product.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", product.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("product_parameters")
          .select("*")
          .eq("product_id", product.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("calculator_configs")
          .select("*")
          .eq("product_id", product.id)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      return {
        ...product,
        category: category ?? null,
        images: images ?? [],
        variants: variants ?? [],
        parameters: parameters ?? [],
        calculator: calculator ?? null,
      } as ProductWithRelations;
    },
    fallback,
    "getProductBySlugWithRelations",
  );
}

/**
 * RPC get_related_products + graceful demo-fallback.
 */
export async function getRelatedProducts(
  productId: number,
  limit = 4,
): Promise<Product[]> {
  const fallback = DEMO_LIST_PRODUCTS.filter((p) => p.id !== productId)
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      category_id: p.category_id,
      name: p.name,
      slug: p.slug,
      description: null,
      short_description: p.short_description,
      sku: null,
      barcode: null,
      pricing_mode: p.pricing_mode,
      price: p.price,
      old_price: null,
      cost_price: null,
      price_from: p.price_from,
      unit: p.unit,
      stock: 999,
      track_stock: false,
      weight: null,
      dimensions: null,
      brand: null,
      status: "active" as const,
      is_featured: p.is_featured,
      is_new: p.is_new,
      is_on_sale: false,
      has_installation: p.has_installation,
      lead_time_days: null,
      attributes: {},
      tags: [],
      seo_title: null,
      seo_description: null,
      seo_keywords: null,
      sort_order: 0,
      views_count: 0,
      rating_avg: p.rating_avg,
      reviews_count: p.reviews_count,
      search_vector: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    })) as Product[];

  return trySupabase(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("get_related_products", {
        p_product_id: productId,
        p_limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
    fallback,
    "getRelatedProducts",
  );
}

/**
 * RPC calculate_product_price + graceful demo-fallback.
 */
export async function calculateProductPrice(args: {
  productId: number;
  params: Record<string, string | number | boolean>;
}): Promise<PriceCalculationResult> {
  const fallback: PriceCalculationResult = calculateDemoPrice(
    args.productId,
    args.params,
  );

  return trySupabase(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc("calculate_product_price", {
        p_product_id: args.productId,
        p_params: args.params as Database["public"]["Functions"]["calculate_product_price"]["Args"]["p_params"],
      });
      if (error) throw error;
      return (data as unknown as PriceCalculationResult) ?? fallback;
    },
    fallback,
    "calculateProductPrice",
  );
}
