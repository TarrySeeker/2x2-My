"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/features/auth/api";
import {
  setFeaturedPortfolio,
  PORTFOLIO_FEATURED_CACHE_TAG,
} from "@/lib/data/portfolio";
import { sql } from "@/lib/db/client";
import {
  createPortfolioItem,
  updatePortfolioItem,
  deletePortfolioItem,
  reorderPortfolioItems,
} from "@/features/admin/api/portfolio";
import {
  portfolioItemSchema,
  portfolioReorderSchema,
} from "@/features/admin/schemas/portfolio";

/**
 * Server actions портфолио — полный CRUD + выбор «3 главных» работ
 * для блока на главной.
 *
 * Permissions:
 *   create / update / setFeatured / reorder → owner | manager | content
 *     (контент-менеджер ведёт портфолио в рамках CMS).
 *   delete → owner | manager only
 *     (контент-менеджер не может физически удалять записи —
 *      это защита от случайной потери реализованных проектов).
 *
 * Cache invalidation:
 *   - revalidatePath('/portfolio')   — публичная страница списка
 *   - revalidatePath('/')            — главная (3 featured-работы)
 *   - revalidatePath('/admin/content/portfolio')
 *   - revalidateTag(PORTFOLIO_FEATURED_CACHE_TAG) — для unstable_cache
 */

const PORTFOLIO_TAG = "portfolio";

const idSchema = z.number().int().positive();

interface ActionResult<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit log helper
// ─────────────────────────────────────────────────────────────────────────────

async function logAudit(
  userId: string,
  action: string,
  entityId: number | null,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    await sql`
      SELECT log_admin_action(
        ${userId},
        ${action},
        'portfolio_items',
        ${entityId},
        NULL,
        ${sql.json(meta as unknown as Parameters<typeof sql.json>[0])},
        NULL,
        NULL
      )
    `;
  } catch (err) {
    // Не валим основное действие из-за audit-проблемы.
    console.warn("[portfolio audit]", err);
  }
}

function invalidatePortfolioCache(): void {
  // updateTag (Next 16+) — инвалидация unstable_cache по тегу.
  // Используется и для общего тега `portfolio`, и для featured-кеша.
  updateTag(PORTFOLIO_FEATURED_CACHE_TAG);
  updateTag(PORTFOLIO_TAG);
  revalidatePath("/portfolio");
  revalidatePath("/");
  revalidatePath("/admin/content/portfolio");
}

// ─────────────────────────────────────────────────────────────────────────────
// setFeatured (legacy — НЕ ЛОМАЕМ)
// ─────────────────────────────────────────────────────────────────────────────

const setFeaturedSchema = z.object({
  ids: z.array(z.number().int().positive()).max(3),
});

export async function setFeaturedPortfolioAction(
  data: unknown,
): Promise<ActionResult> {
  const profile = await requireAdmin(["owner", "manager", "content"]);

  const parsed = setFeaturedSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await setFeaturedPortfolio(parsed.data.ids);

    invalidatePortfolioCache();

    await logAudit(profile.id, "portfolio.set_featured", null, {
      ids: parsed.data.ids,
    });

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Не удалось обновить «главные» работы";
    return { ok: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function createPortfolioItemAction(
  data: unknown,
): Promise<ActionResult<{ id: number }>> {
  const profile = await requireAdmin(["owner", "manager", "content"]);

  const parsed = portfolioItemSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    const result = await createPortfolioItem(parsed.data);

    invalidatePortfolioCache();
    await logAudit(profile.id, "portfolio.create", result.id, {
      slug: parsed.data.slug,
      title: parsed.data.title,
    });

    return { ok: true, data: result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось создать работу";
    // Дружественное сообщение про unique slug.
    if (message.includes("portfolio_items_slug")) {
      return {
        ok: false,
        error: `Slug «${parsed.data.slug}» уже занят. Выберите другой.`,
      };
    }
    return { ok: false, error: message };
  }
}

export async function updatePortfolioItemAction(
  id: unknown,
  data: unknown,
): Promise<ActionResult> {
  const profile = await requireAdmin(["owner", "manager", "content"]);

  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) {
    return { ok: false, error: "Некорректный id" };
  }

  const parsed = portfolioItemSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await updatePortfolioItem(idParsed.data, parsed.data);

    invalidatePortfolioCache();
    await logAudit(profile.id, "portfolio.update", idParsed.data, {
      slug: parsed.data.slug,
    });

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить работу";
    if (message.includes("portfolio_items_slug")) {
      return {
        ok: false,
        error: `Slug «${parsed.data.slug}» уже занят другим элементом.`,
      };
    }
    return { ok: false, error: message };
  }
}

export async function deletePortfolioItemAction(
  id: unknown,
): Promise<ActionResult> {
  // content-менеджер НЕ может удалять — только owner/manager.
  const profile = await requireAdmin(["owner", "manager"]);

  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) {
    return { ok: false, error: "Некорректный id" };
  }

  try {
    await deletePortfolioItem(idParsed.data);

    invalidatePortfolioCache();
    await logAudit(profile.id, "portfolio.delete", idParsed.data, {});

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось удалить работу";
    return { ok: false, error: message };
  }
}

export async function reorderPortfolioItemsAction(
  orders: unknown,
): Promise<ActionResult> {
  const profile = await requireAdmin(["owner", "manager", "content"]);

  const parsed = portfolioReorderSchema.safeParse(orders);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await reorderPortfolioItems(parsed.data);

    invalidatePortfolioCache();
    await logAudit(profile.id, "portfolio.reorder", null, {
      count: parsed.data.length,
    });

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось изменить порядок";
    return { ok: false, error: message };
  }
}

/**
 * Удобный «toggle published» (soft-delete-замена).
 * Через update payload — но проще иметь отдельный action для UI-чекбокса.
 */
export async function togglePortfolioPublishedAction(
  id: unknown,
  isPublished: unknown,
): Promise<ActionResult> {
  const profile = await requireAdmin(["owner", "manager", "content"]);

  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) {
    return { ok: false, error: "Некорректный id" };
  }
  const flagParsed = z.boolean().safeParse(isPublished);
  if (!flagParsed.success) {
    return { ok: false, error: "Некорректное значение" };
  }

  try {
    await sql`
      UPDATE portfolio_items
      SET is_published = ${flagParsed.data},
          updated_at   = NOW()
      WHERE id = ${idParsed.data}
    `;

    invalidatePortfolioCache();
    await logAudit(profile.id, "portfolio.toggle_published", idParsed.data, {
      is_published: flagParsed.data,
    });

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить статус";
    return { ok: false, error: message };
  }
}
