import { z } from "zod";

export const generalSettingsSchema = z.object({
  store_name: z.string().min(1).max(200).optional(),
  store_description: z.string().max(500).optional(),
  store_phone: z.string().max(50).optional(),
  store_email: z.string().email().max(200).optional().or(z.literal("")),
  store_address: z.string().max(500).optional(),
  working_hours: z.string().max(300).optional(),
});

export const legalSettingsSchema = z.object({
  legal_name: z.string().max(300).optional(),
  legal_inn: z.string().max(20).optional(),
  legal_ogrn: z.string().max(20).optional(),
  legal_address: z.string().max(500).optional(),
});

export const brandingSettingsSchema = z.object({
  logo_url: z.string().max(500).optional().or(z.literal("")),
  favicon_url: z.string().max(500).optional().or(z.literal("")),
  social_vk: z.string().max(300).optional().or(z.literal("")),
  social_telegram: z.string().max(300).optional().or(z.literal("")),
  social_whatsapp: z.string().max(300).optional().or(z.literal("")),
});

export const deliverySettingsSchema = z.object({
  cdek_from_city: z.string().max(200).optional(),
  cdek_from_city_code: z.number().int().nonnegative().optional(),
  free_delivery_threshold: z.number().nonnegative().optional(),
});

export const promoBarSettingsSchema = z.object({
  promo_bar_text: z.string().max(300).optional().or(z.literal("")),
  promo_bar_link: z.string().max(500).optional().or(z.literal("")),
  promo_bar_active: z.boolean().optional(),
});

export const settingsUpdateSchema = z.array(
  z.object({
    key: z.string().min(1),
    value: z.unknown(),
  }),
);

export type GeneralSettingsData = z.infer<typeof generalSettingsSchema>;
export type LegalSettingsData = z.infer<typeof legalSettingsSchema>;
export type BrandingSettingsData = z.infer<typeof brandingSettingsSchema>;
export type DeliverySettingsData = z.infer<typeof deliverySettingsSchema>;
export type PromoBarSettingsData = z.infer<typeof promoBarSettingsSchema>;
