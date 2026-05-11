"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireOwner } from "@/features/auth/api";
import { sql } from "@/lib/db/client";
import {
  SERVICE_CATEGORIES_CACHE_TAG,
  createServiceCategory,
  deleteServiceCategory,
  getServiceCategoryById,
  listAllServiceCategoriesForAdmin,
  reorderServiceCategories,
  updateServiceCategory,
} from "@/features/admin/api/service-categories";
import {
  serviceCategorySchema,
  serviceCategoryReorderSchema,
} from "@/features/admin/schemas/service-category";
import type { ServiceCategory } from "@/types";
import { z } from "zod";

/**
 * Server actions для CRUD категорий услуг (`service_categories`).
 *
 * Все экшены требуют `requireAdmin` (owner / manager). После каждой
 * мутации:
 *   1. invalidate `service-categories` cache tag — чтобы витрина и
 *      форма услуги увидели актуальный список.
 *   2. revalidatePath: `/`, `/services`, `/admin/content/services`,
 *      `/admin/content/services-categories`.
 *   3. Audit-лог через `log_admin_action` (RPC из миграции 003,
 *      обёрнут в try/catch — миграция может отсутствовать в local-среде,
 *      см. LESSONS_LEARNED Категория 18).
 *
 * BIGSERIAL id — `z.coerce.number()` (LESSONS_LEARNED Категория 2).
 */

const idSchema = z.coerce.number().int().positive();

interface ActionResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}

async function audit(
  userId: string,
  action: string,
  recordId: number | null,
  payload: unknown,
): Promise<void> {
  try {
    await sql`
      SELECT log_admin_action(
        ${userId},
        ${action},
        'service_categories',
        ${recordId},
        NULL,
        ${sql.json(payload as unknown as Parameters<typeof sql.json>[0])},
        NULL,
        NULL
      )
    `;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[service-categories audit]", action, err);
    }
  }
}

function invalidate() {
  updateTag(SERVICE_CATEGORIES_CACHE_TAG);
  // revalidatePath с 'layout' — категории рендерятся внутри RSC-секций,
  // которые сидят в общем layout (Header → ServicesPreview, /services).
  revalidatePath("/", "layout");
  revalidatePath("/services");
  revalidatePath("/admin/content/services");
  revalidatePath("/admin/content/services-categories");
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchServiceCategoriesAction(): Promise<
  ServiceCategory[]
> {
  await requireOwner();
  return listAllServiceCategoriesForAdmin();
}

// ─────────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────────

export async function createServiceCategoryAction(
  raw: unknown,
): Promise<ActionResult & { category?: ServiceCategory }> {
  const profile = await requireOwner();

  const parsed = serviceCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    const { id } = await createServiceCategory(parsed.data);
    const created = await getServiceCategoryById(id);
    invalidate();
    await audit(profile.id, "service_categories.create", id, parsed.data);
    return { ok: true, category: created ?? undefined, data: { id } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось создать категорию";
    const friendly = message.includes("service_categories_slug_key")
      ? "Категория с таким slug уже существует"
      : message;
    return { ok: false, error: friendly };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────────────

export async function updateServiceCategoryAction(
  rawId: number | string,
  raw: unknown,
): Promise<ActionResult & { category?: ServiceCategory }> {
  const profile = await requireOwner();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return { ok: false, error: "Некорректный ID" };

  const parsed = serviceCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    const before = await getServiceCategoryById(idResult.data);
    if (!before) return { ok: false, error: "Категория не найдена" };

    await updateServiceCategory(idResult.data, parsed.data);
    const updated = await getServiceCategoryById(idResult.data);

    // Если slug сменился — нужно мигрировать `services.category` на
    // новое значение, иначе все услуги, привязанные к старому slug,
    // окажутся в группе «(не из списка)». Делаем это атомарно.
    if (before.slug !== parsed.data.slug.toLowerCase()) {
      await sql`
        UPDATE services
        SET category = ${parsed.data.slug.toLowerCase()}, updated_at = NOW()
        WHERE category = ${before.slug}
      `;
    }

    invalidate();
    await audit(
      profile.id,
      "service_categories.update",
      idResult.data,
      parsed.data,
    );
    return { ok: true, category: updated ?? undefined };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить категорию";
    const friendly = message.includes("service_categories_slug_key")
      ? "Категория с таким slug уже существует"
      : message;
    return { ok: false, error: friendly };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteServiceCategoryAction(
  rawId: number | string,
): Promise<ActionResult> {
  const profile = await requireOwner();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return { ok: false, error: "Некорректный ID" };

  try {
    await deleteServiceCategory(idResult.data);
    invalidate();
    await audit(
      profile.id,
      "service_categories.delete",
      idResult.data,
      null,
    );
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось удалить категорию";
    return { ok: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reorder (drag-n-drop)
// ─────────────────────────────────────────────────────────────────────────────

export async function reorderServiceCategoriesAction(
  raw: unknown,
): Promise<ActionResult> {
  const profile = await requireOwner();

  const parsed = serviceCategoryReorderSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Некорректный порядок",
    };
  }

  try {
    await reorderServiceCategories(parsed.data);
    invalidate();
    await audit(
      profile.id,
      "service_categories.reorder",
      null,
      { count: parsed.data.length },
    );
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось сохранить порядок";
    return { ok: false, error: message };
  }
}
