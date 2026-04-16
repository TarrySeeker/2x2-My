import { describe, expect, it } from "vitest";
import { blogPostSchema, blogCategorySchema } from "@/features/admin/schemas/blog";

const validPost = {
  title: "Как выбрать вывеску для бизнеса",
  slug: "kak-vybrat-vyvesqu",
  content: "<p>Содержимое статьи о вывесках...</p>",
  status: "draft" as const,
};

const validCategory = {
  name: "Наружная реклама",
  slug: "naruzhnaya-reklama",
};

describe("blogPostSchema", () => {
  it("accepts valid blog post with required fields", () => {
    const result = blogPostSchema.safeParse(validPost);
    expect(result.success).toBe(true);
  });

  it("rejects post without title", () => {
    const result = blogPostSchema.safeParse({ ...validPost, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects post without slug", () => {
    const result = blogPostSchema.safeParse({ ...validPost, slug: "" });
    expect(result.success).toBe(false);
  });

  it("rejects post without content", () => {
    const result = blogPostSchema.safeParse({ ...validPost, content: "" });
    expect(result.success).toBe(false);
  });

  it("validates status enum (draft/published/archived)", () => {
    expect(blogPostSchema.safeParse({ ...validPost, status: "draft" }).success).toBe(true);
    expect(blogPostSchema.safeParse({ ...validPost, status: "published" }).success).toBe(true);
    expect(blogPostSchema.safeParse({ ...validPost, status: "archived" }).success).toBe(true);
    expect(blogPostSchema.safeParse({ ...validPost, status: "deleted" }).success).toBe(false);
  });

  it("rejects title exceeding 300 chars", () => {
    const result = blogPostSchema.safeParse({ ...validPost, title: "a".repeat(301) });
    expect(result.success).toBe(false);
  });

  it("validates seo_title max length (60 chars)", () => {
    expect(blogPostSchema.safeParse({ ...validPost, seo_title: "a".repeat(60) }).success).toBe(true);
    expect(blogPostSchema.safeParse({ ...validPost, seo_title: "a".repeat(61) }).success).toBe(false);
  });

  it("validates seo_description max length (160 chars)", () => {
    expect(blogPostSchema.safeParse({ ...validPost, seo_description: "a".repeat(160) }).success).toBe(true);
    expect(blogPostSchema.safeParse({ ...validPost, seo_description: "a".repeat(161) }).success).toBe(false);
  });

  it("accepts nullable optional fields", () => {
    const result = blogPostSchema.safeParse({
      ...validPost,
      excerpt: null,
      cover_image_url: null,
      category_id: null,
      published_at: null,
      seo_title: null,
      seo_description: null,
      seo_keywords: null,
      reading_time: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts post with all optional fields filled", () => {
    const result = blogPostSchema.safeParse({
      ...validPost,
      excerpt: "Краткое описание",
      cover_image_url: "/images/cover.jpg",
      category_id: 5,
      published_at: "2026-01-15T12:00:00Z",
      seo_title: "SEO заголовок",
      seo_description: "SEO описание",
      seo_keywords: "вывеска, реклама",
      reading_time: 5,
      tags: ["вывески", "наружная реклама"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects excerpt exceeding 500 chars", () => {
    const result = blogPostSchema.safeParse({ ...validPost, excerpt: "a".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejects negative reading_time", () => {
    const result = blogPostSchema.safeParse({ ...validPost, reading_time: -1 });
    expect(result.success).toBe(false);
  });

  it("defaults tags to empty array", () => {
    const result = blogPostSchema.safeParse(validPost);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual([]);
    }
  });
});

describe("blogCategorySchema", () => {
  it("accepts valid category", () => {
    const result = blogCategorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
  });

  it("rejects category without name", () => {
    const result = blogCategorySchema.safeParse({ ...validCategory, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects category without slug", () => {
    const result = blogCategorySchema.safeParse({ ...validCategory, slug: "" });
    expect(result.success).toBe(false);
  });

  it("validates name max length (200 chars)", () => {
    expect(blogCategorySchema.safeParse({ ...validCategory, name: "a".repeat(200) }).success).toBe(true);
    expect(blogCategorySchema.safeParse({ ...validCategory, name: "a".repeat(201) }).success).toBe(false);
  });

  it("accepts optional description", () => {
    const result = blogCategorySchema.safeParse({ ...validCategory, description: "Описание категории" });
    expect(result.success).toBe(true);
  });

  it("accepts null description", () => {
    const result = blogCategorySchema.safeParse({ ...validCategory, description: null });
    expect(result.success).toBe(true);
  });

  it("defaults sort_order to 0", () => {
    const result = blogCategorySchema.safeParse(validCategory);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort_order).toBe(0);
    }
  });

  it("rejects negative sort_order", () => {
    const result = blogCategorySchema.safeParse({ ...validCategory, sort_order: -1 });
    expect(result.success).toBe(false);
  });
});
