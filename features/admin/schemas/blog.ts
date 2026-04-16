import { z } from "zod";

export const blogPostSchema = z.object({
  title: z.string().min(1, "Заголовок обязателен").max(300),
  slug: z.string().min(1, "Slug обязателен").max(300),
  excerpt: z.string().max(500).nullable().default(null),
  content: z.string().min(1, "Контент обязателен"),
  cover_image_url: z.string().nullable().default(null),
  category_id: z.number().int().positive().nullable().default(null),
  status: z.enum(["draft", "published", "archived"]),
  published_at: z.string().nullable().default(null),
  seo_title: z.string().max(60).nullable().default(null),
  seo_description: z.string().max(160).nullable().default(null),
  seo_keywords: z.string().max(500).nullable().default(null),
  reading_time: z.number().int().nonnegative().nullable().default(null),
  tags: z.array(z.string()).default([]),
});

export const blogCategorySchema = z.object({
  name: z.string().min(1, "Название обязательно").max(200),
  slug: z.string().min(1, "Slug обязателен").max(200),
  description: z.string().max(1000).nullable().default(null),
  sort_order: z.number().int().nonnegative().default(0),
});

export type BlogPostFormData = z.infer<typeof blogPostSchema>;
export type BlogCategoryFormData = z.infer<typeof blogCategorySchema>;
