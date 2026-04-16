import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Название обязательно").max(200),
  slug: z.string().min(1, "Slug обязателен").max(200),
  parent_id: z.number().int().positive().optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  icon: z.string().max(100).optional().nullable(),
  image_url: z.string().optional().nullable(),
  cover_url: z.string().optional().nullable(),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.number().int().nonnegative(),
  seo_title: z.string().max(60).optional().nullable(),
  seo_description: z.string().max(160).optional().nullable(),
  seo_keywords: z.string().max(500).optional().nullable(),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
