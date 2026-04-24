import { z } from "zod";

const dimensionsSchema = z
  .object({
    length: z.number().nonnegative().optional(),
    width: z.number().nonnegative().optional(),
    height: z.number().nonnegative().optional(),
  })
  .optional()
  .nullable();

const imageSchema = z.object({
  id: z.number().optional(),
  url: z.string().min(1),
  alt_text: z.string().max(255).optional().nullable(),
  sort_order: z.number().int().nonnegative(),
  is_primary: z.boolean(),
});

const variantSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Название варианта обязательно").max(200),
  sku: z.string().max(100).optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
  old_price: z.number().nonnegative().optional().nullable(),
  stock: z.number().int().nonnegative(),
  attributes: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()]),
  ),
  image_url: z.string().optional().nullable(),
  is_active: z.boolean(),
  sort_order: z.number().int().nonnegative(),
});

export const productSchema = z
  .object({
    name: z.string().min(1, "Название обязательно").max(300),
    slug: z.string().min(1, "Slug обязателен").max(300),
    category_id: z.number().int().positive().optional().nullable(),
    status: z.enum(["active", "draft", "archived"]),
    pricing_mode: z.enum(["fixed", "calculator", "quote"]),
    short_description: z.string().max(500).optional().nullable(),
    description: z.string().optional().nullable(),
    price: z.number().nonnegative({
      message: "Цена не может быть отрицательной",
    }),
    old_price: z.number().nonnegative().optional().nullable(),
    cost_price: z.number().nonnegative().optional().nullable(),
    /**
     * Верхняя граница диапазона «от X до Y». NULL/undefined — рендерим
     * только «от {price}». Если задана — должна быть >= price (см. refine ниже).
     */
    price_to: z.number().positive().optional().nullable(),
    unit: z.string().max(50).optional().nullable(),
    sku: z.string().max(100).optional().nullable(),
    barcode: z.string().max(100).optional().nullable(),
    stock: z.number().int().nonnegative(),
    track_stock: z.boolean(),
    weight: z.number().nonnegative().optional().nullable(),
    dimensions: dimensionsSchema,
    brand: z.string().max(200).optional().nullable(),
    is_featured: z.boolean(),
    is_new: z.boolean(),
    is_on_sale: z.boolean(),
    has_installation: z.boolean(),
    lead_time_days: z.number().int().nonnegative().optional().nullable(),
    min_quantity: z.number().int().positive().optional().nullable(),
    attributes: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    ),
    tags: z.array(z.string()),
    seo_title: z.string().max(60).optional().nullable(),
    seo_description: z.string().max(160).optional().nullable(),
    seo_keywords: z.string().max(500).optional().nullable(),
    sort_order: z.number().int().nonnegative(),
    images: z.array(imageSchema),
    variants: z.array(variantSchema),
  })
  .refine(
    (data) =>
      data.price_to == null || data.price_to >= data.price,
    {
      message: "Верхняя граница цены должна быть не меньше нижней",
      path: ["price_to"],
    },
  );

export type ProductFormData = z.infer<typeof productSchema>;
