"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/features/auth/api";
import { sql } from "@/lib/db/client";
import {
  PORTFOLIO_CATEGORIES_CACHE_TAG,
  createPortfolioCategory,
  deletePortfolioCategory,
  getPortfolioCategoryById,
  listAllPortfolioCategoriesForAdmin,
  reorderPortfolioCategories,
  updatePortfolioCategory,
} from "@/features/admin/api/portfolio-categories";
import {
  portfolioCategorySchema,
  portfolioCategoryReorderSchema,
} from "@/features/admin/schemas/portfolio-category";
import { PORTFOLIO_FEATURED_CACHE_TAG } from "@/lib/data/portfolio";
import type { PortfolioCategory } from "@/types";
import { z } from "zod";

/**
 * Server actions для CRUD категорий портфолио (`portfolio_categories`).
 *
 * Все экшены требуют `requireAdmin` (owner / manager). После каждой
 * мутации:
 *   1. invalidate `portfolio-categories` cache tag — чтобы витрина и
 *      форма работы увидели актуальный список.
 *   2. Также инвалидируем PORTFOLIO_FEATURED_CACHE_TAG — карточки
 *      портфолио на витрине показывают category_label, который должен
 *      обновиться синхронно с переименованием категории.
 *   3. revalidatePath: `/`, `/portfolio`, `/admin/content/portfolio`,
 *      `/admin/content/portfolio-categories`.
 *   4. Audit-лог через `log_admin_action` (RPC из миграции 003,
 *      обёрнут в try/catch — миграция может отсутствовать в local-среде,
 *      см. LESSONS_LEARNED Категория 18).
 *
 * BIGSERIAL id — `z.coerce.number()` (LESSONS_LEARNED Категория 2).
 *
 * ОТЛИЧИЕ ОТ services-categories: при смене slug услуги мигрировались по
 * `services.category = old_slug`. У портфолио в БД хранится LABEL, а не
 * slug, поэтому при смене label мы обновляем `portfolio_items.category_label`
 * со старого label на новый (в той же транзакции, чтобы работы не
 * «вывалились» из категории).
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
        'portfolio_categories',
        ${recordId},
        NULL,
        ${sql.json(payload as unknown as Parameters<typeof sql.json>[0])},
        NULL,
        NULL
      )
    `;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[portfolio-categories audit]", action, err);
    }
  }
}

function invalidate() {
  updateTag(PORTFOLIO_CATEGORIES_CACHE_TAG);
  // Также сбрасываем кеш self-портфолио — карточки на витрине
  // показывают category_label, который мог измениться.
  updateTag(PORTFOLIO_FEATURED_CACHE_TAG);
  // revalidatePath с 'layout' — категории рендерятся в RSC-секциях,
  // которые сидят в общем layout (Header → главная, /portfolio).
  revalidatePath("/", "layout");
  revalidatePath("/portfolio");
  revalidatePath("/admin/content/portfolio");
  revalidatePath("/admin/content/portfolio-categories");
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchPortfolioCategoriesAction(): Promise<
  PortfolioCategory[]
> {
  await requireAdmin();
  return listAllPortfolioCategoriesForAdmin();
}

// ─────────────────────────────────────────────────────────────────────────────
// Create
// ─────────────────────────────────────────────────────────────────────────────

export async function createPortfolioCategoryAction(
  raw: unknown,
): Promise<ActionResult & { category?: PortfolioCategory }> {
  const profile = await requireAdmin();

  const parsed = portfolioCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    const { id } = await createPortfolioCategory(parsed.data);
    const created = await getPortfolioCategoryById(id);
    invalidate();
    await audit(profile.id, "portfolio_categories.create", id, parsed.data);
    return { ok: true, category: created ?? undefined, data: { id } };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось создать категорию";
    const friendly = message.includes("portfolio_categories_slug_key")
      ? "Категория с таким slug уже существует"
      : message;
    return { ok: false, error: friendly };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Update
// ─────────────────────────────────────────────────────────────────────────────

export async function updatePortfolioCategoryAction(
  rawId: number | string,
  raw: unknown,
): Promise<ActionResult & { category?: PortfolioCategory }> {
  const profile = await requireAdmin();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return { ok: false, error: "Некорректный ID" };

  const parsed = portfolioCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    const before = await getPortfolioCategoryById(idResult.data);
    if (!before) return { ok: false, error: "Категория не найдена" };

    await updatePortfolioCategory(idResult.data, parsed.data);
    const updated = await getPortfolioCategoryById(idResult.data);

    // Если LABEL сменился — нужно мигрировать `portfolio_items.category_label`
    // на новое значение, иначе все работы, привязанные к старому label,
    // окажутся в категории «(старая)» (а на витрине — «выпадут» из фильтра,
    // поскольку фильтр сравнивает строкой строго).
    // Для портфолио в БД хранится именно LABEL, а не slug
    // (см. db/migrations/031_portfolio_categories.sql).
    if (before.label !== parsed.data.label) {
      await sql`
        UPDATE portfolio_items
        SET category_label = ${parsed.data.label}, updated_at = NOW()
        WHERE category_label = ${before.label}
      `;
    }

    invalidate();
    await audit(
      profile.id,
      "portfolio_categories.update",
      idResult.data,
      parsed.data,
    );
    return { ok: true, category: updated ?? undefined };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить категорию";
    const friendly = message.includes("portfolio_categories_slug_key")
      ? "Категория с таким slug уже существует"
      : message;
    return { ok: false, error: friendly };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────

export async function deletePortfolioCategoryAction(
  rawId: number | string,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) return { ok: false, error: "Некорректный ID" };

  try {
    await deletePortfolioCategory(idResult.data);
    invalidate();
    await audit(
      profile.id,
      "portfolio_categories.delete",
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

export async function reorderPortfolioCategoriesAction(
  raw: unknown,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const parsed = portfolioCategoryReorderSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Некорректный порядок",
    };
  }

  try {
    await reorderPortfolioCategories(parsed.data);
    invalidate();
    await audit(
      profile.id,
      "portfolio_categories.reorder",
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
