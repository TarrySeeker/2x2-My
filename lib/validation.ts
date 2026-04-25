import { z } from "zod";

const phoneRegex = /^\+?[78]\d{10}$/;
const cleanPhone = (val: string) => val.replace(/[\s\-()]/g, "");

export const phoneSchema = z
  .string()
  .min(1, "Телефон обязателен")
  .transform(cleanPhone)
  .pipe(z.string().regex(phoneRegex, "Некорректный формат телефона"));

export const emailSchema = z.string().email("Некорректный email").max(255);

export const optionalEmailSchema = z.preprocess(
  (v) => (typeof v === "string" && v.length > 0 ? v : null),
  z.string().email("Некорректный email").max(255).nullable(),
);

// ── Promo code (маркер на формах заявок, без автоскидки) ──
// На /api/leads/* и /api/contact промокод приходит как опциональная
// строка. НЕ валидируем против таблицы promo_codes (чтобы не раскрывать
// перебором список действующих кодов). Делаем только формат-санитайз:
//   - trim
//   - длина 4..50
//   - латиница / цифры / `_-` (исключаем кириллицу — клиент-агрегатор
//     отчётов сильно проще, когда коды нормализованы).
//
// Пустая строка / отсутствие поля → null. Это позволяет фронту слать
// `promoCode: ""` без необходимости явного `undefined`.
const PROMO_CODE_REGEX = /^[A-Za-z0-9_-]{4,50}$/;
export const promoCodeSchema = z.preprocess(
  (v) => {
    if (typeof v !== "string") return null;
    const trimmed = v.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z
    .union([
      z
        .string()
        .max(50, "Промокод слишком длинный")
        .regex(PROMO_CODE_REGEX, "Промокод: только латиница, цифры, _ и -"),
      z.null(),
    ])
    .optional(),
);

// ── PD-consent (152-ФЗ) ──
// Все формы обратной связи требуют явное согласие чекбоксом.
// На уровне Zod это `z.literal(true)` — любое другое значение → ошибка.
const pdConsentField = z.literal(true, {
  message: "Необходимо согласие на обработку персональных данных",
});

// ── Contact form ──
export const contactSchema = z.object({
  name: z.string().min(1, "Имя обязательно").max(200),
  email: optionalEmailSchema,
  phone: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v ? cleanPhone(v) : null)),
  subject: z.string().max(300).optional().nullable(),
  message: z.string().min(1, "Сообщение обязательно").max(5000),
  promoCode: promoCodeSchema,
  pdConsent: pdConsentField,
});
export type ContactInput = z.infer<typeof contactSchema>;

// ── One-click ──
export const oneClickSchema = z.object({
  name: z.string().min(1, "Имя обязательно").max(200),
  phone: phoneSchema,
  comment: z.string().max(2000).optional().nullable(),
  product_id: z.union([z.number(), z.string()]).optional().nullable().transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }),
  product_name: z.string().max(500).optional().nullable(),
  page_url: z.string().max(2000).optional().nullable(),
  promoCode: promoCodeSchema,
  pdConsent: pdConsentField,
});
export type OneClickInput = z.infer<typeof oneClickSchema>;

// ── Calc request ──
const optionalPositiveId = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  });

export const calcRequestSchema = z.object({
  product_id: optionalPositiveId,
  product_name: z.string().max(500).optional().nullable(),
  category_id: optionalPositiveId,
  customer_name: z.string().min(1, "Имя обязательно").max(200),
  customer_phone: phoneSchema,
  customer_email: optionalEmailSchema,
  company_name: z.string().max(300).optional().nullable(),
  comment: z.string().max(5000).optional().nullable(),
  params: z.record(z.unknown()).default({}),
  attachments: z.array(z.string().url()).max(10).default([]),
  source_url: z.string().max(2000).optional().nullable(),
  promoCode: promoCodeSchema,
  pdConsent: pdConsentField,
});
export type CalcRequestInput = z.infer<typeof calcRequestSchema>;

// ── CDEK ──
export const cdekCalculateSchema = z.object({
  to_city_code: z.number().int().positive(),
  packages: z
    .array(
      z.object({
        weight: z.number().int().min(1),
        length: z.number().int().min(1).optional().default(20),
        width: z.number().int().min(1).optional().default(15),
        height: z.number().int().min(1).optional().default(10),
      }),
    )
    .min(1),
  tariff_codes: z.array(z.number().int()).optional(),
});
export type CdekCalculateInput = z.infer<typeof cdekCalculateSchema>;

export const cdekCitiesSchema = z.object({
  query: z.string().min(2).max(100),
  size: z.number().int().min(1).max(50).optional().default(10),
});

// ── Helpers ──
export function parseBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { data: T } | { error: string; details?: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      error: result.error.issues.map((i) => i.message).join("; "),
      details: result.error.issues,
    };
  }
  return { data: result.data };
}

export function parseSearchParams<T>(
  schema: z.ZodSchema<T>,
  params: URLSearchParams,
): { data: T } | { error: string } {
  const obj: Record<string, string> = {};
  params.forEach((v, k) => {
    obj[k] = v;
  });
  return parseBody(schema, obj);
}
