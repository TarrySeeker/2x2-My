import { listAllPortfolioCategoriesForAdmin } from "@/features/admin/api/portfolio-categories";
import PortfolioCategoriesPageClient from "@/features/admin/components/PortfolioCategoriesPageClient";

export const metadata = { title: "Категории портфолио" };

// Админ-страницы с CMS-fetch'ами всегда dynamic — иначе сломается next build
// в Docker (placeholder DATABASE_URL, см. lib/db/client.ts).
export const dynamic = "force-dynamic";

/**
 * Справочник категорий портфолио (CRUD). Создаются здесь, используются
 * на витрине (/portfolio — фильтр-кнопки) и в форме портфолио в админке
 * (/admin/content/portfolio).
 *
 * В админке показываем ТОЛЬКО реальные строки из БД (без stub-fallback'ов
 * — иначе UPDATE по фиктивному id silent no-op'ом ничего не меняет;
 * см. LESSONS_LEARNED Категория 3). Если БД пустая — empty-state.
 */
export default async function PortfolioCategoriesAdminPage() {
  const categories = await listAllPortfolioCategoriesForAdmin();
  return <PortfolioCategoriesPageClient initialCategories={categories} />;
}
