import { sql } from "@/lib/db/client";
import {
  PORTFOLIO_STUB,
  toPortfolioItemShape,
} from "@/data/portfolio-stub";
import type { PortfolioItem } from "@/types";
import PortfolioFeaturedPageClient from "@/features/admin/components/PortfolioFeaturedPageClient";

export const metadata = { title: "Портфолио — Главная" };

async function loadAllPortfolio(): Promise<PortfolioItem[]> {
  try {
    const rows = await sql<PortfolioItem[]>`
      SELECT *
      FROM portfolio_items
      ORDER BY is_published DESC, sort_order ASC, id DESC
    `;
    if (rows.length > 0) return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[admin/portfolio] DB request failed, using stub:", err);
    }
  }
  return PORTFOLIO_STUB.map(toPortfolioItemShape);
}

export default async function PortfolioFeaturedPage() {
  const items = await loadAllPortfolio();
  return <PortfolioFeaturedPageClient items={items} />;
}
