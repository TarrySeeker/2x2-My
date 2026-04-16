import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type {
  AdminProductFilters,
  ProductWithImage,
  ProductFull,
} from "@/features/admin/types";
import type { ProductFormData } from "@/features/admin/schemas/product";
import type { ProductStatus, Json } from "@/types/database";
import type { InsertRow, UpdateRow } from "@/lib/supabase/table-types";

type AttributeValue = string | number | boolean | null;
type AttributeMap = Record<string, AttributeValue>;

/** Safely convert JSON from DB to flat key-value attributes map. */
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
  if (!isSupabaseConfigured()) return { data: [], total: 0 };

  const supabase = createAdminClient();
  const { page, perPage, search, status, categoryId } = filters;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data: products, count } = await query;

  if (!products) return { data: [], total: 0 };

  // Fetch primary images and category names in parallel
  const productIds = products.map((p) => p.id);
  const categoryIds = [
    ...new Set(products.map((p) => p.category_id).filter(Boolean)),
  ] as number[];

  const { data: images } = await supabase
    .from("product_images")
    .select("product_id, url")
    .in("product_id", productIds)
    .eq("is_primary", true);

  const imageMap = new Map<number, string>();
  for (const img of images ?? []) {
    imageMap.set(img.product_id, img.url);
  }

  const categoryMap = new Map<number, string>();
  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name")
      .in("id", categoryIds);
    for (const cat of cats ?? []) {
      categoryMap.set(cat.id, cat.name);
    }
  }

  const result: ProductWithImage[] = products.map((p) => ({
    ...p,
    primary_image_url: imageMap.get(p.id) ?? null,
    category_name: p.category_id ? (categoryMap.get(p.category_id) ?? null) : null,
  }));

  return { data: result, total: count ?? 0 };
}

// ── Get single product ──

export async function getProductById(id: number): Promise<ProductFull | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminClient();

  const [productRes, imagesRes, variantsRes] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single(),
    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (!productRes.data) return null;

  const product = productRes.data;

  // Fetch category separately to avoid FK join type issues
  let category: ProductFull["category"] = null;
  if (product.category_id) {
    const { data: cat } = await supabase
      .from("categories")
      .select("*")
      .eq("id", product.category_id)
      .single();
    category = cat;
  }

  return {
    ...product,
    images: imagesRes.data ?? [],
    variants: variantsRes.data ?? [],
    category,
  };
}

// ── Create ──

export async function createProduct(
  data: ProductFormData,
): Promise<{ id: number }> {
  const supabase = createAdminClient();

  const { images, variants, ...productData } = data;

  const insertData: InsertRow<"products"> = {
    name: productData.name,
    slug: productData.slug,
    category_id: productData.category_id ?? null,
    status: productData.status,
    pricing_mode: productData.pricing_mode,
    short_description: productData.short_description ?? null,
    description: productData.description ?? null,
    price: productData.price,
    old_price: productData.old_price ?? null,
    cost_price: productData.cost_price ?? null,
    price_from: productData.price_from,
    unit: productData.unit ?? null,
    sku: productData.sku ?? null,
    barcode: productData.barcode ?? null,
    stock: productData.stock,
    track_stock: productData.track_stock,
    weight: productData.weight ?? null,
    dimensions: productData.dimensions ?? null,
    brand: productData.brand ?? null,
    is_featured: productData.is_featured,
    is_new: productData.is_new,
    is_on_sale: productData.is_on_sale,
    has_installation: productData.has_installation,
    lead_time_days: productData.lead_time_days ?? null,
    attributes: productData.attributes ?? {},
    tags: productData.tags ?? [],
    seo_title: productData.seo_title ?? null,
    seo_description: productData.seo_description ?? null,
    seo_keywords: productData.seo_keywords ?? null,
    sort_order: productData.sort_order,
    deleted_at: null,
  };

  const { data: product, error } = await supabase
    .from("products")
    .insert(insertData)
    .select("id")
    .single();

  if (error || !product) {
    throw new Error(error?.message ?? "Не удалось создать товар");
  }

  // Insert images
  if (images.length > 0) {
    const imageInserts: InsertRow<"product_images">[] = images.map((img) => ({
      product_id: product.id,
      url: img.url,
      alt_text: img.alt_text ?? null,
      sort_order: img.sort_order,
      is_primary: img.is_primary,
    }));

    await supabase.from("product_images").insert(imageInserts);
  }

  // Insert variants
  if (variants.length > 0) {
    const variantInserts: InsertRow<"product_variants">[] = variants.map(
      (v) => ({
        product_id: product.id,
        name: v.name,
        sku: v.sku ?? null,
        price: v.price ?? null,
        old_price: v.old_price ?? null,
        stock: v.stock,
        attributes: v.attributes ?? {},
        image_url: v.image_url ?? null,
        sort_order: v.sort_order,
        is_active: v.is_active,
      }),
    );

    await supabase.from("product_variants").insert(variantInserts);
  }

  return { id: product.id };
}

// ── Update ──

export async function updateProduct(
  id: number,
  data: ProductFormData,
): Promise<void> {
  const supabase = createAdminClient();

  const { images, variants, ...productData } = data;

  const updateData: UpdateRow<"products"> = {
    name: productData.name,
    slug: productData.slug,
    category_id: productData.category_id ?? null,
    status: productData.status,
    pricing_mode: productData.pricing_mode,
    short_description: productData.short_description ?? null,
    description: productData.description ?? null,
    price: productData.price,
    old_price: productData.old_price ?? null,
    cost_price: productData.cost_price ?? null,
    price_from: productData.price_from,
    unit: productData.unit ?? null,
    sku: productData.sku ?? null,
    barcode: productData.barcode ?? null,
    stock: productData.stock,
    track_stock: productData.track_stock,
    weight: productData.weight ?? null,
    dimensions: productData.dimensions ?? null,
    brand: productData.brand ?? null,
    is_featured: productData.is_featured,
    is_new: productData.is_new,
    is_on_sale: productData.is_on_sale,
    has_installation: productData.has_installation,
    lead_time_days: productData.lead_time_days ?? null,
    attributes: productData.attributes ?? {},
    tags: productData.tags ?? [],
    seo_title: productData.seo_title ?? null,
    seo_description: productData.seo_description ?? null,
    seo_keywords: productData.seo_keywords ?? null,
    sort_order: productData.sort_order,
  };

  const { error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", id);

  if (error) throw new Error(error.message);

  // Replace images: delete old, insert new
  await supabase.from("product_images").delete().eq("product_id", id);

  if (images.length > 0) {
    const imageInserts: InsertRow<"product_images">[] = images.map((img) => ({
      product_id: id,
      url: img.url,
      alt_text: img.alt_text ?? null,
      sort_order: img.sort_order,
      is_primary: img.is_primary,
    }));

    await supabase.from("product_images").insert(imageInserts);
  }

  // Replace variants: delete old, insert new
  await supabase.from("product_variants").delete().eq("product_id", id);

  if (variants.length > 0) {
    const variantInserts: InsertRow<"product_variants">[] = variants.map(
      (v) => ({
        product_id: id,
        name: v.name,
        sku: v.sku ?? null,
        price: v.price ?? null,
        old_price: v.old_price ?? null,
        stock: v.stock,
        attributes: v.attributes ?? {},
        image_url: v.image_url ?? null,
        sort_order: v.sort_order,
        is_active: v.is_active,
      }),
    );

    await supabase.from("product_variants").insert(variantInserts);
  }
}

// ── Delete ──

export async function deleteProduct(id: number): Promise<void> {
  const supabase = createAdminClient();

  // Soft delete
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ── Duplicate ──

export async function duplicateProduct(
  id: number,
): Promise<{ id: number }> {
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

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ status })
    .in("id", ids);

  if (error) throw new Error(error.message);
}

export async function bulkDelete(ids: number[]): Promise<void> {
  if (ids.length === 0) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids);

  if (error) throw new Error(error.message);
}
