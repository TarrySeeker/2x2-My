import { listAllServiceCategoriesForAdmin } from "@/features/admin/api/service-categories";
import ServiceCategoriesPageClient from "@/features/admin/components/ServiceCategoriesPageClient";

export const metadata = { title: "Категории услуг" };

// Админ-страницы с CMS-fetch'ами всегда dynamic — иначе сломается next build
// в Docker (placeholder DATABASE_URL, см. lib/db/client.ts).
export const dynamic = "force-dynamic";

/**
 * Справочник категорий услуг (CRUD). Создаются здесь, используются на
 * витрине и в форме услуги (/admin/content/services).
 *
 * В админке показываем ТОЛЬКО реальные строки из БД (без stub-fallback'ов
 * — иначе UPDATE по фиктивному id silent no-op'ом ничего не меняет;
 * см. LESSONS_LEARNED Категория 3). Если БД пустая — empty-state.
 */
export default async function ServiceCategoriesAdminPage() {
  const categories = await listAllServiceCategoriesForAdmin();
  return <ServiceCategoriesPageClient initialCategories={categories} />;
}
