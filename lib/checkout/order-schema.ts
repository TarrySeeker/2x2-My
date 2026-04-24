import { z } from "zod";
import { phoneSchema } from "@/lib/validation";

const companySchema = z.object({
  name: z.string().min(2, "Название компании обязательно").max(200),
  inn: z.string().regex(/^\d{10}(\d{2})?$/, "ИНН: 10 или 12 цифр"),
  kpp: z.string().regex(/^\d{9}$/, "КПП: 9 цифр").or(z.literal("")).optional(),
  address: z.string().min(5).max(500).or(z.literal("")).optional(),
});

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().optional(),
  name: z.string().min(1, "Название товара обязательно").max(300),
  sku: z.string().optional(),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  imageUrl: z.string().optional(),
  attributes: z.record(z.string(), z.string()).optional(),
});

const _baseSchema = z.object({
  customer: z.object({
    name: z.string().min(2, "Имя обязательно").max(100),
    phone: phoneSchema,
    email: z.string().email("Некорректный email").or(z.literal("")).optional(),
    isB2B: z.boolean().default(false),
    company: companySchema.optional(),
  }),
  delivery: z.object({
    type: z.enum(["pickup", "courier_local", "cdek"]),
    // Город:
    //   pickup        — игнорируется (всегда офис в Ханты-Мансийске).
    //   courier_local — фиксируется как «Ханты-Мансийск» (default).
    //   cdek          — произвольный город (заполняет клиент).
    city: z.string().max(120).optional(),
    address: z.string().max(500).optional(),
  }),
  installation: z
    .object({
      required: z.boolean().default(false),
      address: z.string().max(500).optional(),
      date: z.string().optional(),
      notes: z.string().max(1000).optional(),
    })
    .optional(),
  payment: z.object({
    // Онлайн-оплата выпилена. Доступны:
    //   bank_transfer — счёт от менеджера (default для всех B2C/B2B).
    //   cash          — оплата наличными при самовывозе.
    method: z.enum(["bank_transfer", "cash"]).default("bank_transfer"),
  }),
  promoCode: z.string().optional(),
  customerComment: z.string().max(2000).optional(),
  items: z.array(orderItemSchema).min(1, "Корзина не может быть пустой"),
  utm: z
    .object({
      source: z.string().optional(),
      medium: z.string().optional(),
      campaign: z.string().optional(),
    })
    .optional(),
});

export type OrderInput = z.infer<typeof _baseSchema>;

export const orderSchema = _baseSchema.superRefine((data, ctx) => {
  if (data.customer.isB2B && !data.customer.company) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Для юрлица необходимо заполнить реквизиты компании",
      path: ["customer", "company"],
    });
  }
  if (data.delivery.type === "courier_local" && !data.delivery.address) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Укажите адрес доставки курьером",
      path: ["delivery", "address"],
    });
  }
  if (data.delivery.type === "cdek" && !data.delivery.city) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Укажите город доставки СДЭК",
      path: ["delivery", "city"],
    });
  }
});
