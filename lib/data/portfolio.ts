import "server-only";

import { createClient } from "@/lib/supabase/server";
import { trySupabase } from "@/lib/data/try-supabase";
import type { PortfolioItem } from "@/types";
import {
  PORTFOLIO_STUB,
  toPortfolioItemShape,
  type PortfolioStub,
} from "@/data/portfolio-stub";

/**
 * Возвращает опубликованные работы портфолио.
 * Этап 1: стаб из data/portfolio-stub.ts. При настроенном Supabase — чтение из БД.
 */
export async function getPortfolio(): Promise<PortfolioItem[]> {
  const fallback: PortfolioItem[] = PORTFOLIO_STUB.filter(
    (p) => p.is_published,
  )
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(toPortfolioItemShape);

  return trySupabase(
    async () => {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("is_published", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PortfolioItem[];
    },
    fallback,
    "getPortfolio",
  );
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
