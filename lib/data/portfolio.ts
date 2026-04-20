import "server-only";

import { sql } from "@/lib/db/client";
import type { PortfolioItem } from "@/types";
import {
  PORTFOLIO_STUB,
  toPortfolioItemShape,
  type PortfolioStub,
} from "@/data/portfolio-stub";

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
