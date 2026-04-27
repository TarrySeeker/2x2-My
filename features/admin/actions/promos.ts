"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  getPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  checkCodeUniqueness,
} from "@/features/admin/api/promos";
import { requireAdmin } from "@/features/auth/api";
import {
  promoSchema,
  promoFilterSchema,
  promoCodeCheckSchema,
} from "@/features/admin/schemas/promo";
import { logAdminAction } from "@/lib/audit";

// BIGSERIAL id → строка в RSC payload. coerce принимает оба варианта.
const idSchema = z.coerce.number().int().positive();

export async function fetchPromoCodesAction(filters: unknown) {
  await requireAdmin();
  const validated = promoFilterSchema.parse(filters);
  return getPromoCodes(validated);
}

export async function createPromoCodeAction(data: unknown) {
  const profile = await requireAdmin();
  try {
    const validated = promoSchema.parse(data);
    const promo = await createPromoCode(validated);
    revalidatePath("/admin/promos");
    await logAdminAction(
      profile.id,
      "promos.create",
      "promo_codes",
      (promo as { id?: number | string } | null)?.id ?? null,
      { code: validated.code, type: validated.type },
    );
    return { success: true, data: promo };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0]?.message ?? "Ошибка валидации" };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка создания промокода",
    };
  }
}

export async function updatePromoCodeAction(id: number, data: unknown) {
  const profile = await requireAdmin();
  try {
    const validatedId = idSchema.parse(id);
    const validated = promoSchema.parse(data);
    const promo = await updatePromoCode(validatedId, validated);
    revalidatePath("/admin/promos");
    await logAdminAction(
      profile.id,
      "promos.update",
      "promo_codes",
      validatedId,
      { code: validated.code, type: validated.type },
    );
    return { success: true, data: promo };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0]?.message ?? "Ошибка валидации" };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка обновления промокода",
    };
  }
}

export async function deletePromoCodeAction(id: number) {
  const profile = await requireAdmin();
  try {
    const validatedId = idSchema.parse(id);
    await deletePromoCode(validatedId);
    revalidatePath("/admin/promos");
    await logAdminAction(
      profile.id,
      "promos.delete",
      "promo_codes",
      validatedId,
      null,
    );
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка удаления промокода",
    };
  }
}

export async function checkCodeUniquenessAction(data: unknown) {
  await requireAdmin();
  try {
    const validated = promoCodeCheckSchema.parse(data);
    const isUnique = await checkCodeUniqueness(validated.code);
    return { success: true, data: { isUnique } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Ошибка проверки",
    };
  }
}
