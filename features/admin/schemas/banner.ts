import { z } from "zod";

export const bannerSchema = z.object({
  title: z.string().max(200).nullable().default(null),
  subtitle: z.string().max(300).nullable().default(null),
  description: z.string().max(1000).nullable().default(null),
  image_url: z.string().min(1, "Изображение обязательно"),
  mobile_image_url: z.string().nullable().default(null),
  link: z.string().max(500).nullable().default(null),
  button_text: z.string().max(100).nullable().default(null),
  badge: z.string().max(100).nullable().default(null),
  position: z.string().min(1).max(50).default("hero"),
  is_active: z.boolean().default(true),
  active_from: z.string().nullable().default(null),
  active_to: z.string().nullable().default(null),
});

export type BannerFormData = z.infer<typeof bannerSchema>;
