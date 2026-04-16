import { z } from "zod";

export const redirectSchema = z.object({
  from_path: z.string().min(1, "Путь «откуда» обязателен").max(500),
  to_path: z.string().min(1, "Путь «куда» обязателен").max(500),
  type: z.number().int().refine((v) => v === 301 || v === 302, {
    message: "Тип должен быть 301 или 302",
  }),
  is_active: z.boolean().default(true),
});

export const seoTemplateSchema = z.object({
  seo_title_template: z.string().max(300).default(""),
  seo_description_template: z.string().max(500).default(""),
});

export type RedirectFormData = z.infer<typeof redirectSchema>;
export type SeoTemplateFormData = z.infer<typeof seoTemplateSchema>;
