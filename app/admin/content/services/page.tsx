import { listAllServices } from "@/lib/data/services";
import { listAllServiceCategoriesForAdmin } from "@/features/admin/api/service-categories";
import ServicesPageClient from "@/features/admin/components/ServicesPageClient";

export const metadata = { title: "Услуги — админка" };

// Админ-страницы с CMS-fetch'ами всегда dynamic — иначе сломается next build
// в Docker (placeholder DATABASE_URL, см. lib/db/client.ts).
export const dynamic = "force-dynamic";

export default async function ServicesAdminPage() {
  // Параллельно: услуги + справочник категорий. Категории передаются
  // в форму услуги (выпадающий список вместо захардкоженного
  // SERVICE_CATEGORIES — теперь клиент может добавлять новые через
  // /admin/content/services-categories).
  const [services, categories] = await Promise.all([
    listAllServices(),
    listAllServiceCategoriesForAdmin(),
  ]);
  return (
    <ServicesPageClient
      initialServices={services}
      serviceCategories={categories}
    />
  );
}
