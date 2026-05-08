import { getAllPortfolioForAdmin } from "@/features/admin/api/portfolio";
import { listAllPortfolioCategoriesForAdmin } from "@/features/admin/api/portfolio-categories";
import PortfolioPageClient from "@/features/admin/components/PortfolioPageClient";

export const metadata = { title: "Портфолио" };
export const dynamic = "force-dynamic";

/**
 * В админке показываем ТОЛЬКО реальные строки из БД.
 * Никаких stub-fallback'ов: в админке любая отображаемая карточка должна
 * быть редактируемой записью БД с настоящим id, иначе UPDATE по фиктивному
 * id — silent no-op (Postgres не находит строку, ничего не пишет, ошибки нет).
 *
 * Если БД отвечает, но пуста — компонент покажет empty-state «Работ пока
 * нет, нажмите “Добавить работу”». Если БД упала — getAllPortfolioForAdmin
 * вернёт [] (с warn'ом в dev) и поведение будет таким же.
 *
 * ВАЖНО: публичная витрина `/portfolio` сохраняет stub-fallback в
 * `lib/data/portfolio.ts:getPortfolio()`, чтобы посетители видели примеры
 * до того, как клиент наполнит реальными работами.
 *
 * Параллельно тянем справочник категорий портфолио (миграция 031) — он
 * подставляется в <select> формы редактирования работы. До миграции
 * категории были захардкожены в lib/portfolio/categories.ts, теперь
 * редактируются через /admin/content/portfolio-categories.
 */
export default async function PortfolioAdminPage() {
  const [items, portfolioCategories] = await Promise.all([
    getAllPortfolioForAdmin(),
    listAllPortfolioCategoriesForAdmin(),
  ]);
  return (
    <PortfolioPageClient
      items={items}
      portfolioCategories={portfolioCategories}
    />
  );
}
