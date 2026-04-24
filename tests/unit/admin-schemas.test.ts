import { describe, expect, it } from "vitest";
import { productSchema } from "@/features/admin/schemas/product";
import { categorySchema } from "@/features/admin/schemas/category";

const validProduct = {
  name: "Визитки 1000 шт.",
  slug: "vizitki-1000-sht",
  price: 1700,
  price_to: null,
  status: "draft" as const,
  pricing_mode: "fixed" as const,
  stock: 100,
  track_stock: true,
  is_featured: false,
  is_new: false,
  is_on_sale: false,
  has_installation: false,
  sort_order: 0,
  attributes: {},
  tags: [],
  images: [],
  variants: [],
};

const validCategory = {
  name: "Наружная реклама",
  slug: "naruzhnaya-reklama",
  is_active: true,
  is_featured: false,
  sort_order: 0,
};

describe("productSchema", () => {
  it("accepts valid product with all required fields", () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it("rejects product without name", () => {
    const result = productSchema.safeParse({ ...validProduct, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects product without slug", () => {
    const result = productSchema.safeParse({ ...validProduct, slug: "" });
    expect(result.success).toBe(false);
  });

  it("rejects negative price", () => {
    const result = productSchema.safeParse({ ...validProduct, price: -100 });
    expect(result.success).toBe(false);
  });

  it("accepts zero price", () => {
    const result = productSchema.safeParse({ ...validProduct, price: 0 });
    expect(result.success).toBe(true);
  });

  it("validates seo_title max length (60 chars)", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      seo_title: "a".repeat(61),
    });
    expect(result.success).toBe(false);
  });

  it("validates seo_description max length (160 chars)", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      seo_description: "a".repeat(161),
    });
    expect(result.success).toBe(false);
  });

  it("accepts product with images", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      images: [
        { url: "/img/test.jpg", sort_order: 0, is_primary: true },
        { url: "/img/test2.jpg", sort_order: 1, is_primary: false, alt_text: "Alt" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects image without url", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      images: [{ url: "", sort_order: 0, is_primary: true }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts product with variants", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      variants: [
        {
          name: "Глянцевые",
          sku: "VIZ-GL",
          price: 2000,
          stock: 50,
          attributes: { finish: "glossy" },
          is_active: true,
          sort_order: 0,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects variant without name", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      variants: [
        { name: "", sku: null, stock: 0, attributes: {}, is_active: true, sort_order: 0 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("validates status enum", () => {
    const result = productSchema.safeParse({ ...validProduct, status: "invalid" });
    expect(result.success).toBe(false);
  });

  it("validates pricing_mode enum", () => {
    const result = productSchema.safeParse({ ...validProduct, pricing_mode: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts optional nullable fields as null", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      category_id: null,
      old_price: null,
      cost_price: null,
      weight: null,
      dimensions: null,
      brand: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("categorySchema", () => {
  it("accepts valid category", () => {
    const result = categorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it("rejects category without name", () => {
    const result = categorySchema.safeParse({ ...validCategory, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects category without slug", () => {
    const result = categorySchema.safeParse({ ...validCategory, slug: "" });
    expect(result.success).toBe(false);
  });

  it("accepts optional parent_id", () => {
    const result = categorySchema.safeParse({ ...validCategory, parent_id: 5 });
    expect(result.success).toBe(true);
  });

  it("accepts null parent_id", () => {
    const result = categorySchema.safeParse({ ...validCategory, parent_id: null });
    expect(result.success).toBe(true);
  });

  it("validates name max length (200 chars)", () => {
    const result = categorySchema.safeParse({
      ...validCategory,
      name: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("validates seo fields max length", () => {
    const long60 = categorySchema.safeParse({
      ...validCategory,
      seo_title: "a".repeat(61),
    });
    expect(long60.success).toBe(false);

    const long160 = categorySchema.safeParse({
      ...validCategory,
      seo_description: "a".repeat(161),
    });
    expect(long160.success).toBe(false);
  });

  it("accepts optional fields as null", () => {
    const result = categorySchema.safeParse({
      ...validCategory,
      description: null,
      icon: null,
      image_url: null,
      seo_title: null,
    });
    expect(result.success).toBe(true);
  });
});
