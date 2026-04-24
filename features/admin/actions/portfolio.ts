"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/features/auth/api";
import {
  setFeaturedPortfolio,
  PORTFOLIO_FEATURED_CACHE_TAG,
} from "@/lib/data/portfolio";
import { sql } from "@/lib/db/client";

/**
 * Server actions для портфолио: выбор «3 главных» работ для главной.
 *
 * Полный CRUD портфолио живёт в `features/admin/api/portfolio.ts`
 * (если есть) или будет добавлен отдельно — здесь только то, что
 * нужно для блока «Наши работы» этапа 2.
 */

const setFeaturedSchema = z.object({
  ids: z.array(z.number().int().positive()).max(3),
});

interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function setFeaturedPortfolioAction(
  data: unknown,
): Promise<ActionResult> {
  const profile = await requireAdmin();

  const parsed = setFeaturedSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await setFeaturedPortfolio(parsed.data.ids);

    updateTag(PORTFOLIO_FEATURED_CACHE_TAG);
    revalidatePath("/");
    revalidatePath("/admin/content/portfolio");

    try {
      await sql`
        SELECT log_admin_action(
          ${profile.id},
          'portfolio.set_featured',
          'portfolio_items',
          NULL,
          NULL,
          ${sql.json(parsed.data as unknown as Parameters<typeof sql.json>[0])},
          NULL,
          NULL
        )
      `;
    } catch (auditErr) {
      console.warn("[portfolio audit]", auditErr);
    }

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить «главные» работы";
    return { ok: false, error: message };
  }
}
