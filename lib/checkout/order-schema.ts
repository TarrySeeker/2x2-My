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
    type: z.enum(["pickup", "courier", "cdek"]),
    address: z.string().max(500).optional(),
    tariffCode: z.number().int().positive().optional(),
    pointCode: z.string().max(50).optional(),
    pointAddress: z.string().max(500).optional(),
    cityCode: z.number().int().positive().optional(),
    cost: z.number().nonnegative().optional(),
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
    method: z.enum(["cash_on_delivery", "invoice", "cdek_pay"]),
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
  if (data.delivery.type === "courier" && !data.delivery.address) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Укажите адрес доставки курьером",
      path: ["delivery", "address"],
    });
  }
});
