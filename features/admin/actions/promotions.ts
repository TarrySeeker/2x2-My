"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/features/auth/api";
import {
  createPromotion,
  updatePromotion,
  deletePromotion,
  setPromotionPopup,
  PROMOTIONS_CACHE_TAG,
} from "@/lib/data/promotions";
import {
  promotionSchema,
  togglePromotionPopupSchema,
} from "@/features/admin/schemas/promotions";
import { deleteFile, isS3Configured } from "@/lib/storage/s3";
import { sql } from "@/lib/db/client";

const idSchema = z.number().int().positive();

interface ActionResult {
  ok: boolean;
  error?: string;
}

function inputFromForm(data: z.infer<typeof promotionSchema>) {
  return {
    title: data.title.trim(),
    body: data.body.trim(),
    imageUrl: data.image_url ?? null,
    linkUrl: data.link_url ?? null,
    linkText: data.link_text ?? null,
    validFrom: data.valid_from ?? null,
    validTo: data.valid_to ?? null,
    isActive: data.is_active,
    showAsPopup: data.show_as_popup,
    sortOrder: data.sort_order,
  };
}

async function audit(
  userId: string,
  action: string,
  recordId: string | null,
  payload: unknown,
): Promise<void> {
  try {
    await sql`
      SELECT log_admin_action(
        ${userId},
        ${action},
        'promotions',
        ${recordId},
        NULL,
        ${sql.json(payload as unknown as Parameters<typeof sql.json>[0])},
        NULL,
        NULL
      )
    `;
  } catch (err) {
    console.warn("[promotions audit]", action, err);
  }
}

function invalidate() {
  updateTag(PROMOTIONS_CACHE_TAG);
  revalidatePath("/");
  revalidatePath("/admin/content/promotions");
}

export async function createPromotionAction(
  data: unknown,
): Promise<ActionResult & { id?: number }> {
  const profile = await requireAdmin();

  const parsed = promotionSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    const created = await createPromotion(inputFromForm(parsed.data));
    invalidate();
    await audit(profile.id, "promotions.create", String(created.id), parsed.data);
    return { ok: true, id: created.id };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось создать акцию";
    return { ok: false, error: message };
  }
}

export async function updatePromotionAction(
  rawId: number,
  data: unknown,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return { ok: false, error: "Некорректный ID" };

  const parsed = promotionSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await updatePromotion(idResult.data, inputFromForm(parsed.data));
    invalidate();
    await audit(
      profile.id,
      "promotions.update",
      String(idResult.data),
      parsed.data,
    );
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить акцию";
    return { ok: false, error: message };
  }
}

export async function deletePromotionAction(
  rawId: number,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return { ok: false, error: "Некорректный ID" };

  try {
    const imageUrl = await deletePromotion(idResult.data);
    if (imageUrl) {
      await tryDeleteByPublicUrl(imageUrl);
    }
    invalidate();
    await audit(profile.id, "promotions.delete", String(idResult.data), null);
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось удалить акцию";
    return { ok: false, error: message };
  }
}

export async function togglePromotionPopupAction(
  rawId: number,
  data: unknown,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return { ok: false, error: "Некорректный ID" };

  const parsed = togglePromotionPopupSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await setPromotionPopup(idResult.data, parsed.data.show_as_popup);
    invalidate();
    await audit(
      profile.id,
      "promotions.toggle_popup",
      String(idResult.data),
      parsed.data,
    );
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить попап";
    return { ok: false, error: message };
  }
}

async function tryDeleteByPublicUrl(publicUrl: string): Promise<void> {
  if (!isS3Configured()) return;
  const base = process.env.S3_PUBLIC_URL;
  if (!base) return;
  const normalized = base.replace(/\/$/, "") + "/";
  if (!publicUrl.startsWith(normalized)) return;
  const key = publicUrl.slice(normalized.length);
  if (!key) return;
  try {
    await deleteFile(key);
  } catch (err) {
    console.warn("[promotions] deleteFile failed:", err);
  }
}
