"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/features/auth/api";
import {
  createService,
  updateService,
  softDeleteService,
  hardDeleteService,
  reorderServices,
  getServiceById,
  SERVICES_CACHE_TAG,
  type ServiceInput,
} from "@/lib/data/services";
import {
  serviceSchema,
  reorderServicesSchema,
} from "@/features/admin/schemas/services";
import { deleteFile, isS3Configured } from "@/lib/storage/s3";
import { sql } from "@/lib/db/client";
import type { Service } from "@/types";

/**
 * Server actions для CRUD'а услуг каталога (`services`).
 *
 * Все экшены требуют requireAdmin — owner/manager (контент-менеджер
 * читает блог и контент сайта; редактирование услуг — у менеджеров).
 *
 * После любой мутации:
 *   1. invalidate cache tag `services` → следующий запрос витрины
 *      обновит карточки.
 *   2. revalidatePath ключевых маршрутов, где услуги выводятся:
 *      `/`, `/services`, `/admin/content/services`.
 *
 * Audit-лог пишется через `log_admin_action` (RPC из миграции 003).
 */

const idSchema = z.string().uuid("Некорректный ID");

interface ActionResult {
  ok: boolean;
  error?: string;
}

function inputFromForm(data: z.infer<typeof serviceSchema>): ServiceInput {
  return {
    slug: data.slug.toLowerCase(),
    title: data.title,
    shortDescription: data.short_description ?? null,
    longDescription: data.long_description ?? null,
    priceFrom: data.price_from ?? null,
    priceUnit: data.price_unit ?? null,
    priceLabel: data.price_label ?? null,
    icon: data.icon ?? null,
    coverImage: data.cover_image ? data.cover_image : null,
    category: data.category ?? null,
    href: data.href ? data.href : null,
    enabled: data.enabled,
    displayOrder: data.display_order,
    features: data.features ?? null,
    seoTitle: data.seo_title ?? null,
    seoDescription: data.seo_description ?? null,
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
        'services',
        ${recordId},
        NULL,
        ${sql.json(payload as unknown as Parameters<typeof sql.json>[0])},
        NULL,
        NULL
      )
    `;
  } catch (err) {
    // log_admin_action может отсутствовать в некоторых local-средах —
    // не блокируем мутацию из-за audit-failure.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[services audit]", action, err);
    }
  }
}

function invalidate() {
  // updateTag — корректный API для server actions в Next 16 (даёт
  // read-your-own-writes семантику). Дополнительно сбрасываем layout-cache,
  // т.к. карточки услуг рендерятся в RSC внутри корневого layout (Header
  // тоже зависит от services через ServicesPreview).
  updateTag(SERVICES_CACHE_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/services");
  revalidatePath("/admin/content/services");
}

export async function createServiceAction(
  data: unknown,
): Promise<ActionResult & { service?: Service }> {
  const profile = await requireAdmin();

  const parsed = serviceSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    const created = await createService(inputFromForm(parsed.data));
    invalidate();
    await audit(profile.id, "services.create", created.id, parsed.data);
    return { ok: true, service: created };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось создать услугу";
    // Уникальность slug на уровне БД даст понятную ошибку — пробрасываем.
    const friendly = message.includes("services_slug_key")
      ? "Услуга с таким slug уже существует"
      : message;
    return { ok: false, error: friendly };
  }
}

export async function updateServiceAction(
  rawId: string,
  data: unknown,
): Promise<ActionResult & { service?: Service }> {
  const profile = await requireAdmin();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return { ok: false, error: "Некорректный ID" };

  const parsed = serviceSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    const before = await getServiceById(idResult.data);
    if (!before) return { ok: false, error: "Услуга не найдена" };

    const updated = await updateService(idResult.data, inputFromForm(parsed.data));

    // Сменилось фото → старое можно удалить из S3 (best-effort).
    const oldImage = before.cover_image;
    const newImage = updated.cover_image;
    if (oldImage && oldImage !== newImage) {
      await tryDeleteByPublicUrl(oldImage);
    }

    invalidate();
    await audit(profile.id, "services.update", idResult.data, parsed.data);
    return { ok: true, service: updated };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить услугу";
    const friendly = message.includes("services_slug_key")
      ? "Услуга с таким slug уже существует"
      : message;
    return { ok: false, error: friendly };
  }
}

/**
 * По умолчанию soft-delete (enabled=false). Если передан `hard: true`,
 * удаляет строку из БД и пытается снести cover_image из S3.
 */
export async function deleteServiceAction(
  rawId: string,
  options?: { hard?: boolean },
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return { ok: false, error: "Некорректный ID" };

  try {
    if (options?.hard) {
      const coverImage = await hardDeleteService(idResult.data);
      if (coverImage) {
        await tryDeleteByPublicUrl(coverImage);
      }
      invalidate();
      await audit(profile.id, "services.hard_delete", idResult.data, null);
    } else {
      const ok = await softDeleteService(idResult.data);
      if (!ok) return { ok: false, error: "Услуга не найдена" };
      invalidate();
      await audit(profile.id, "services.soft_delete", idResult.data, null);
    }
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось удалить услугу";
    return { ok: false, error: message };
  }
}

export async function reorderServicesAction(
  data: unknown,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const parsed = reorderServicesSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await reorderServices(parsed.data.ids);
    invalidate();
    await audit(profile.id, "services.reorder", null, parsed.data);
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось сменить порядок";
    return { ok: false, error: message };
  }
}

/**
 * Best-effort удаление файла из S3 по публичному URL.
 * Молча возвращает, если S3 не настроен или URL не относится к нашему bucket'у
 * (внешние URL-ы и стартовые `/img/...` НЕ удаляются).
 */
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
    if (process.env.NODE_ENV !== "production") {
      console.warn("[services] deleteFile failed:", err);
    }
  }
}
