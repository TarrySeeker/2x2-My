import { z } from "zod";

export const pageSchema = z.object({
  title: z.string().min(1, "Заголовок обязателен").max(300),
  slug: z.string().min(1, "Slug обязателен").max(300),
  content: z.string().min(1, "Контент обязателен"),
  excerpt: z.string().max(500).nullable().default(null),
  cover_url: z.string().nullable().default(null),
  seo_title: z.string().max(60).nullable().default(null),
  seo_description: z.string().max(160).nullable().default(null),
  seo_keywords: z.string().max(500).nullable().default(null),
  is_active: z.boolean().default(true),
  show_in_footer: z.boolean().default(false),
  sort_order: z.number().int().nonnegative().default(0),
});

export type PageFormData = z.infer<typeof pageSchema>;
