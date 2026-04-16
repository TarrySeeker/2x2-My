import { z } from "zod";

const PROMO_TYPES = ["fixed", "percent"] as const;

export const promoSchema = z
  .object({
    code: z
      .string()
      .min(3, "Код минимум 3 символа")
      .max(20, "Код максимум 20 символов")
      .transform((v) => v.toUpperCase()),
    description: z.string().max(500).optional().nullable(),
    type: z.enum(PROMO_TYPES),
    value: z.number().positive("Значение должно быть положительным"),
    min_order_amount: z.number().positive().optional().nullable(),
    max_discount_amount: z.number().positive().optional().nullable(),
    max_uses: z.number().int().min(0).optional().nullable(),
    is_active: z.boolean(),
    valid_from: z.string().optional().nullable(),
    valid_to: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.type === "percent") {
        return data.value >= 1 && data.value <= 100;
      }
      return true;
    },
    { message: "Процент должен быть от 1 до 100", path: ["value"] },
  )
  .refine(
    (data) => {
      if (data.valid_from && data.valid_to) {
        return new Date(data.valid_to) > new Date(data.valid_from);
      }
      return true;
    },
    {
      message: "Дата окончания должна быть позже даты начала",
      path: ["valid_to"],
    },
  );

export const promoFilterSchema = z.object({
  status: z.enum(["all", "active", "inactive", "expired"]).default("all"),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().positive().max(100).default(20),
});

export const promoCodeCheckSchema = z.object({
  code: z.string().min(1).transform((v) => v.toUpperCase()),
});

export type PromoFormData = z.infer<typeof promoSchema>;
export type PromoFilters = z.infer<typeof promoFilterSchema>;
export type PromoCodeCheck = z.infer<typeof promoCodeCheckSchema>;
