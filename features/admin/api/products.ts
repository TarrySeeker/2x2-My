import "server-only";

import { sql, type Tx } from "@/lib/db/client";
import type {
  AdminProductFilters,
  ProductWithImage,
  ProductFull,
} from "@/features/admin/types";
import type { ProductFormData } from "@/features/admin/schemas/product";
import type { ProductStatus, Json } from "@/types/database";
import type { Row } from "@/lib/db/table-types";

type ProductRow = Row<"products">;
type ProductImageRow = Row<"product_images">;
type ProductVariantRow = Row<"product_variants">;
type CategoryRow = Row<"categories">;

type AttributeValue = string | number | boolean | null;
type AttributeMap = Record<string, AttributeValue>;

/** Безопасное приведение JSON из БД к плоской map атрибутов. */
function toAttributeMap(json: Json): AttributeMap {
  if (typeof json === "object" && json !== null && !Array.isArray(json)) {
    const result: AttributeMap = {};
    for (const [key, value] of Object.entries(json)) {
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        result[key] = value;
      }
    }
    return result;
  }
  return {};
}

// ── List with filters ──

export async function getAdminProducts(
  filters: AdminProductFilters,
): Promise<{ data: ProductWithImage[]; total: number }> {
  try {
    const { page, perPage, search, status, categoryId } = filters;
    const offset = (page - 1) * perPage;
    const like = search ? `%${search}%` : null;
    const statusArg = (status ?? null) as string | null;
    const catArg = categoryId ?? null;

    const totalRows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM products
      WHERE deleted_at IS NULL
        AND (${like}::text IS NULL OR name ILIKE ${like})
        AND (${statusArg}::text IS NULL OR status::text = ${statusArg})
        AND (${catArg}::bigint IS NULL OR category_id = ${catArg})
    `;
    const total = totalRows[0]?.count ?? 0;

    const products = await sql<ProductRow[]>`
      SELECT *
      FROM products
      WHERE deleted_at IS NULL
        AND (${like}::text IS NULL OR name ILIKE ${like})
        AND (${statusArg}::text IS NULL OR status::text = ${statusArg})
        AND (${catArg}::bigint IS NULL OR category_id = ${catArg})
      ORDER BY created_at DESC
      LIMIT ${perPage}
      OFFSET ${offset}
    `;

    if (products.length === 0) return { data: [], total };

    const productIds = products.map((p: ProductRow) => p.id);
    const categoryIds = [
      ...new Set(
        products.map((p: ProductRow) => p.category_id).filter(Boolean),
      ),
    ] as number[];

    const images = await sql<{ product_id: number; url: string }[]>`
      SELECT product_id, url
      FROM product_images
      WHERE product_id IN ${sql(productIds)}
        AND is_primary = true
    `;

    const imageMap = new Map<number, string>();
    for (const img of images) imageMap.set(img.product_id, img.url);

    const categoryMap = new Map<number, string>();
    if (categoryIds.length > 0) {
      const cats = await sql<{ id: number; name: string }[]>`
        SELECT id, name
        FROM categories
        WHERE id IN ${sql(categoryIds)}
      `;
      for (const c of cats) categoryMap.set(c.id, c.name);
    }

    const result: ProductWithImage[] = products.map((p: ProductRow) => ({
      ...p,
      primary_image_url: imageMap.get(p.id) ?? null,
      category_name: p.category_id
        ? (categoryMap.get(p.category_id) ?? null)
        : null,
    }));

    return { data: result, total };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getAdminProducts] DB request failed:", err);
    }
    return { data: [], total: 0 };
  }
}

// ── Get single product ──

export async function getProductById(id: number): Promise<ProductFull | null> {
  try {
    const productRows = await sql<ProductRow[]>`
      SELECT *
      FROM products
      WHERE id = ${id}
        AND deleted_at IS NULL
      LIMIT 1
    `;
    const product = productRows[0];
    if (!product) return null;

    const [images, variants] = await Promise.all([
      sql<ProductImageRow[]>`
        SELECT *
        FROM product_images
        WHERE product_id = ${id}
        ORDER BY sort_order ASC
      `,
      sql<ProductVariantRow[]>`
        SELECT *
        FROM product_variants
        WHERE product_id = ${id}
        ORDER BY sort_order ASC
      `,
    ]);

    let category: ProductFull["category"] = null;
    if (product.category_id) {
      const catRows = await sql<CategoryRow[]>`
        SELECT *
        FROM categories
        WHERE id = ${product.category_id}
        LIMIT 1
      `;
      category = catRows[0] ?? null;
    }

    return {
      ...product,
      images,
      variants,
      category,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getProductById] DB request failed:", err);
    }
    return null;
  }
}

// ── Create ──

export async function createProduct(
  data: ProductFormData,
): Promise<{ id: number }> {
  const { images, variants, ...p } = data;

  const result = await sql.begin(async (tx: Tx) => {
    const productRows = await tx<{ id: number }[]>`
      INSERT INTO products (
        name, slug, category_id, status, pricing_mode,
        short_description, description, price, old_price, cost_price,
        price_from, unit, sku, barcode, stock, track_stock,
        weight, dimensions, brand,
        is_featured, is_new, is_on_sale, has_installation, lead_time_days,
        attributes, tags,
        seo_title, seo_description, seo_keywords, sort_order, deleted_at
      )
      VALUES (
        ${p.name},
        ${p.slug},
        ${p.category_id ?? null},
        ${p.status},
        ${p.pricing_mode},
        ${p.short_description ?? null},
        ${p.description ?? null},
        ${p.price},
        ${p.old_price ?? null},
        ${p.cost_price ?? null},
        ${p.price_from},
        ${p.unit ?? null},
        ${p.sku ?? null},
        ${p.barcode ?? null},
        ${p.stock},
        ${p.track_stock},
        ${p.weight ?? null},
        ${tx.json(p.dimensions ?? null)},
        ${p.brand ?? null},
        ${p.is_featured},
        ${p.is_new},
        ${p.is_on_sale},
        ${p.has_installation},
        ${p.lead_time_days ?? null},
        ${tx.json(p.attributes ?? {})},
        ${p.tags ?? []},
        ${p.seo_title ?? null},
        ${p.seo_description ?? null},
        ${p.seo_keywords ?? null},
        ${p.sort_order},
        NULL
      )
      RETURNING id
    `;
    const productId = productRows[0]?.id;
    if (!productId) throw new Error("Не удалось создать товар");

    if (images.length > 0) {
      for (const img of images) {
        await tx`
          INSERT INTO product_images (
            product_id, url, alt_text, sort_order, is_primary
          )
          VALUES (
            ${productId},
            ${img.url},
            ${img.alt_text ?? null},
            ${img.sort_order},
            ${img.is_primary}
          )
        `;
      }
    }

    if (variants.length > 0) {
      for (const v of variants) {
        await tx`
          INSERT INTO product_variants (
            product_id, name, sku, price, old_price, stock,
            attributes, image_url, sort_order, is_active
          )
          VALUES (
            ${productId},
            ${v.name},
            ${v.sku ?? null},
            ${v.price ?? null},
            ${v.old_price ?? null},
            ${v.stock},
            ${tx.json(v.attributes ?? {})},
            ${v.image_url ?? null},
            ${v.sort_order},
            ${v.is_active}
          )
        `;
      }
    }

    return { id: productId };
  });

  return result;
}

// ── Update ──

export async function updateProduct(
  id: number,
  data: ProductFormData,
): Promise<void> {
  const { images, variants, ...p } = data;

  await sql.begin(async (tx: Tx) => {
    await tx`
      UPDATE products
      SET
        name = ${p.name},
        slug = ${p.slug},
        category_id = ${p.category_id ?? null},
        status = ${p.status},
        pricing_mode = ${p.pricing_mode},
        short_description = ${p.short_description ?? null},
        description = ${p.description ?? null},
        price = ${p.price},
        old_price = ${p.old_price ?? null},
        cost_price = ${p.cost_price ?? null},
        price_from = ${p.price_from},
        unit = ${p.unit ?? null},
        sku = ${p.sku ?? null},
        barcode = ${p.barcode ?? null},
        stock = ${p.stock},
        track_stock = ${p.track_stock},
        weight = ${p.weight ?? null},
        dimensions = ${tx.json(p.dimensions ?? null)},
        brand = ${p.brand ?? null},
        is_featured = ${p.is_featured},
        is_new = ${p.is_new},
        is_on_sale = ${p.is_on_sale},
        has_installation = ${p.has_installation},
        lead_time_days = ${p.lead_time_days ?? null},
        attributes = ${tx.json(p.attributes ?? {})},
        tags = ${p.tags ?? []},
        seo_title = ${p.seo_title ?? null},
        seo_description = ${p.seo_description ?? null},
        seo_keywords = ${p.seo_keywords ?? null},
        sort_order = ${p.sort_order}
      WHERE id = ${id}
    `;

    await tx`DELETE FROM product_images WHERE product_id = ${id}`;
    if (images.length > 0) {
      for (const img of images) {
        await tx`
          INSERT INTO product_images (
            product_id, url, alt_text, sort_order, is_primary
          )
          VALUES (
            ${id},
            ${img.url},
            ${img.alt_text ?? null},
            ${img.sort_order},
            ${img.is_primary}
          )
        `;
      }
    }

    await tx`DELETE FROM product_variants WHERE product_id = ${id}`;
    if (variants.length > 0) {
      for (const v of variants) {
        await tx`
          INSERT INTO product_variants (
            product_id, name, sku, price, old_price, stock,
            attributes, image_url, sort_order, is_active
          )
          VALUES (
            ${id},
            ${v.name},
            ${v.sku ?? null},
            ${v.price ?? null},
            ${v.old_price ?? null},
            ${v.stock},
            ${tx.json(v.attributes ?? {})},
            ${v.image_url ?? null},
            ${v.sort_order},
            ${v.is_active}
          )
        `;
      }
    }
  });
}

// ── Delete (soft) ──

export async function deleteProduct(id: number): Promise<void> {
  await sql`
    UPDATE products
    SET deleted_at = NOW()
    WHERE id = ${id}
  `;
}

// ── Duplicate ──

export async function duplicateProduct(id: number): Promise<{ id: number }> {
  const product = await getProductById(id);
  if (!product) throw new Error("Товар не найден");

  const timestamp = Date.now().toString(36);

  const formData: ProductFormData = {
    name: `${product.name} (копия)`,
    slug: `${product.slug}-copy-${timestamp}`,
    category_id: product.category_id,
    status: "draft",
    pricing_mode: product.pricing_mode,
    short_description: product.short_description,
    description: product.description,
    price: product.price,
    old_price: product.old_price,
    cost_price: product.cost_price,
    price_from: product.price_from,
    unit: product.unit,
    sku: product.sku ? `${product.sku}-copy` : null,
    barcode: null,
    stock: product.stock,
    track_stock: product.track_stock,
    weight: product.weight,
    dimensions: product.dimensions,
    brand: product.brand,
    is_featured: false,
    is_new: false,
    is_on_sale: product.is_on_sale,
    has_installation: product.has_installation,
    lead_time_days: product.lead_time_days,
    min_quantity: null,
    attributes: toAttributeMap(product.attributes),
    tags: product.tags,
    seo_title: product.seo_title,
    seo_description: product.seo_description,
    seo_keywords: product.seo_keywords,
    sort_order: product.sort_order,
    images: product.images.map((img) => ({
      url: img.url,
      alt_text: img.alt_text,
      sort_order: img.sort_order,
      is_primary: img.is_primary,
    })),
    variants: product.variants.map((v) => ({
      name: v.name,
      sku: v.sku ? `${v.sku}-copy` : null,
      price: v.price,
      old_price: v.old_price,
      stock: v.stock,
      attributes: toAttributeMap(v.attributes),
      image_url: v.image_url,
      sort_order: v.sort_order,
      is_active: v.is_active,
    })),
  };

  return createProduct(formData);
}

// ── Bulk operations ──

export async function bulkUpdateStatus(
  ids: number[],
  status: ProductStatus,
): Promise<void> {
  if (ids.length === 0) return;
  await sql`
    UPDATE products
    SET status = ${status}
    WHERE id IN ${sql(ids)}
  `;
}

export async function bulkDelete(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await sql`
    UPDATE products
    SET deleted_at = NOW()
    WHERE id IN ${sql(ids)}
  `;
}
