import "server-only";

import { unstable_cache } from "next/cache";

import { sql, type Tx } from "@/lib/db/client";
import type { PortfolioItem } from "@/types";
import {
  PORTFOLIO_STUB,
  toPortfolioItemShape,
  type PortfolioStub,
} from "@/data/portfolio-stub";

/**
 * Доступ к портфолио (`portfolio_items`).
 *
 * Что добавлено в этап 2:
 *  - `listFeaturedPortfolioItems()` — ровно ≤3 «главные» работы
 *    по `is_featured + featured_order` (для блока на главной).
 *  - `setFeaturedPortfolio(ids)` — атомарная замена набора featured
 *    с защитой от >3.
 *
 * Кеш: featured-список через `unstable_cache` (тег `portfolio:featured`).
 */

export const PORTFOLIO_FEATURED_CACHE_TAG = "portfolio:featured";

/**
 * Возвращает опубликованные работы портфолио.
 * Этап 1: стаб из data/portfolio-stub.ts. При наличии БД — чтение из portfolio_items.
 */
export async function getPortfolio(): Promise<PortfolioItem[]> {
  const fallback: PortfolioItem[] = PORTFOLIO_STUB.filter(
    (p) => p.is_published,
  )
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(toPortfolioItemShape);

  try {
    const rows = await sql<PortfolioItem[]>`
      SELECT *
      FROM portfolio_items
      WHERE is_published = true
      ORDER BY sort_order ASC
    `;
    return rows.length > 0 ? rows : fallback;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getPortfolio] DB request failed, using stub:", err);
    }
    return fallback;
  }
}

/**
 * Удобный экспорт стаба для компонентов, работающих напрямую с упрощённой
 * формой (карточки на главной и т.п.).
 */
export function getPortfolioStub(): PortfolioStub[] {
  return PORTFOLIO_STUB.filter((p) => p.is_published).sort(
    (a, b) => a.sort_order - b.sort_order,
  );
}

/**
 * Возвращает ровно ≤3 «главные» работы для блока на главной.
 * Сортируются по `featured_order ASC NULLS LAST, sort_order ASC, id DESC`.
 *
 * Если в админке ничего не помечено — fallback из stub'а
 * (берём первые 3 опубликованные по sort_order).
 */
const listFeaturedCached = unstable_cache(
  async (): Promise<PortfolioItem[]> => {
    try {
      const rows = await sql<PortfolioItem[]>`
        SELECT *
        FROM portfolio_items
        WHERE is_featured = true
          AND is_published = true
        ORDER BY featured_order ASC NULLS LAST,
                 sort_order ASC,
                 id DESC
        LIMIT 3
      `;
      if (rows.length > 0) return rows;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          "[portfolio.listFeatured] DB request failed, using stub:",
          err,
        );
      }
    }
    return PORTFOLIO_STUB.filter((p) => p.is_published)
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, 3)
      .map(toPortfolioItemShape);
  },
  ["portfolio-featured"],
  { revalidate: 60, tags: [PORTFOLIO_FEATURED_CACHE_TAG] },
);

export async function listFeaturedPortfolioItems(): Promise<PortfolioItem[]> {
  return listFeaturedCached();
}

/**
 * Атомарно заменяет «главные» работы.
 *
 * Поведение:
 *  1. Сбрасывает `is_featured=false, featured_order=NULL` у всех текущих featured.
 *  2. Для каждого id из массива (порядок важен) ставит
 *     `is_featured=true, featured_order=index+1`.
 *
 * Защита от >3 — в server action (Zod max(3)). На уровне БД тоже
 * стоит CHECK (`featured_order BETWEEN 1 AND 3 AND is_featured`).
 */
export async function setFeaturedPortfolio(ids: number[]): Promise<void> {
  if (ids.length > 3) {
    throw new Error("Можно отметить не более 3 «главных» работ");
  }

  await sql.begin(async (tx: Tx) => {
    // Сначала сбрасываем все. Это снимает CHECK-конфликт, если ранее
    // были id, не входящие в новый набор.
    await tx`
      UPDATE portfolio_items
      SET is_featured    = false,
          featured_order = NULL,
          updated_at     = NOW()
      WHERE is_featured = true
    `;

    if (ids.length === 0) return;

    // Затем проставляем новый порядок.
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      const order = i + 1;
      await tx`
        UPDATE portfolio_items
        SET is_featured    = true,
            featured_order = ${order},
            updated_at     = NOW()
        WHERE id = ${id}
      `;
    }
  });
}
