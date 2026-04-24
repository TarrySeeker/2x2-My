import "server-only";

import { sql } from "@/lib/db/client";
import type { Row } from "@/lib/db/table-types";
import type {
  CategoryTreeItem,
  Product,
  ProductFacets,
  ProductSort,
  ProductWithRelations,
} from "@/types";
import type { ProductPricingMode } from "@/types/database";

type CategoryRow = Row<"categories">;
type ProductImageRow = Row<"product_images">;
type ProductVariantRow = Row<"product_variants">;
type ProductParameterRow = Row<"product_parameters">;
type CalculatorConfigRow = Row<"calculator_configs">;
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
 * Совпадают с сигнатурой SQL-функции из миграции 003_triggers_and_functions.sql.
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

  try {
    const rows = await sql<CatalogListItem[]>`
      SELECT *
      FROM list_products(
        ${params.categorySlug ?? null},
        ${params.pricingMode ?? null},
        ${params.priceMin ?? null},
        ${params.priceMax ?? null},
        ${params.search ?? null},
        ${sortKey},
        ${perPage}::int,
        ${offset}::int
      )
    `;
    const total = rows[0]?.total_count ?? 0;
    return {
      items: rows,
      total: Number(total),
      page,
      perPage,
      pageCount: Math.max(1, Math.ceil(Number(total) / perPage)),
    } satisfies CatalogListResult;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[listProducts] DB request failed, using demo:", err);
    }
    return fallback;
  }
}

/**
 * RPC get_category_tree + graceful demo-fallback.
 */
export async function getCategoryTree(): Promise<CategoryTreeItem[]> {
  try {
    const rows = await sql<CategoryTreeItem[]>`SELECT * FROM get_category_tree()`;
    return rows.length > 0 ? rows : DEMO_CATEGORY_TREE;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getCategoryTree] DB request failed, using demo:", err);
    }
    return DEMO_CATEGORY_TREE;
  }
}

/**
 * RPC get_product_facets + graceful demo-fallback.
 */
export async function getProductFacets(args: {
  categoryId?: number | null;
  search?: string | null;
} = {}): Promise<ProductFacets> {
  try {
    const rows = await sql<{ get_product_facets: ProductFacets }[]>`
      SELECT get_product_facets(
        ${args.categoryId ?? null}::bigint,
        ${args.search ?? null}
      ) AS get_product_facets
    `;
    return rows[0]?.get_product_facets ?? DEMO_FACETS;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getProductFacets] DB request failed, using demo:", err);
    }
    return DEMO_FACETS;
  }
}

/**
 * Полное получение товара с картинками, параметрами и калькулятором.
 */
export async function getProductBySlugWithRelations(
  slug: string,
): Promise<ProductWithRelations | null> {
  const fallback = DEMO_PRODUCT_DETAILS[slug] ?? null;

  try {
    const productRows = await sql<Product[]>`
      SELECT *
      FROM products
      WHERE slug = ${slug}
        AND status = 'active'
        AND deleted_at IS NULL
      LIMIT 1
    `;

    const product = productRows[0];
    if (!product) return null;

    const [categoryRows, imagesRows, variantsRows, parametersRows, calculatorRows] =
      await Promise.all([
        sql<CategoryRow[]>`
          SELECT *
          FROM categories
          WHERE id = ${product.category_id ?? -1}
          LIMIT 1
        `,
        sql<ProductImageRow[]>`
          SELECT *
          FROM product_images
          WHERE product_id = ${product.id}
          ORDER BY sort_order ASC
        `,
        sql<ProductVariantRow[]>`
          SELECT *
          FROM product_variants
          WHERE product_id = ${product.id}
            AND is_active = true
          ORDER BY sort_order ASC
        `,
        sql<ProductParameterRow[]>`
          SELECT *
          FROM product_parameters
          WHERE product_id = ${product.id}
          ORDER BY sort_order ASC
        `,
        sql<CalculatorConfigRow[]>`
          SELECT *
          FROM calculator_configs
          WHERE product_id = ${product.id}
            AND is_active = true
          LIMIT 1
        `,
      ]);

    return {
      ...product,
      category: categoryRows[0] ?? null,
      images: imagesRows ?? [],
      variants: variantsRows ?? [],
      parameters: parametersRows ?? [],
      calculator: calculatorRows[0] ?? null,
    } as ProductWithRelations;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getProductBySlugWithRelations] DB request failed:", err);
    }
    return fallback;
  }
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
      price_to: p.price_to,
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

  try {
    const rows = await sql<Product[]>`
      SELECT *
      FROM get_related_products(${productId}::bigint, ${limit}::int)
    `;
    return rows.length > 0 ? rows : fallback;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getRelatedProducts] DB request failed, using demo:", err);
    }
    return fallback;
  }
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

  try {
    const rows = await sql<{ calculate_product_price: PriceCalculationResult }[]>`
      SELECT calculate_product_price(
        ${args.productId}::bigint,
        ${sql.json(args.params)}::jsonb
      ) AS calculate_product_price
    `;
    return rows[0]?.calculate_product_price ?? fallback;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[calculateProductPrice] DB request failed, using demo:", err);
    }
    return fallback;
  }
}
