import { getAllPortfolioForAdmin } from "@/features/admin/api/portfolio";
import {
  PORTFOLIO_STUB,
  toPortfolioItemShape,
} from "@/data/portfolio-stub";
import type { PortfolioItem } from "@/types";
import PortfolioPageClient from "@/features/admin/components/PortfolioPageClient";

export const metadata = { title: "Портфолио" };
export const dynamic = "force-dynamic";

async function loadAllPortfolio(): Promise<PortfolioItem[]> {
  const rows = await getAllPortfolioForAdmin();
  if (rows.length > 0) return rows;
  // Fallback на stub только если в БД пусто И сама БД отвечает.
  // (getAllPortfolioForAdmin сама ловит ошибку и возвращает []).
  return PORTFOLIO_STUB.map(toPortfolioItemShape);
}

export default async function PortfolioAdminPage() {
  const items = await loadAllPortfolio();
  return <PortfolioPageClient items={items} />;
}
