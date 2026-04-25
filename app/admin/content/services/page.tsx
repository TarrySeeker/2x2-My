import { listAllServices } from "@/lib/data/services";
import ServicesPageClient from "@/features/admin/components/ServicesPageClient";

export const metadata = { title: "Услуги — админка" };

// Админ-страницы с CMS-fetch'ами всегда dynamic — иначе сломается next build
// в Docker (placeholder DATABASE_URL, см. lib/db/client.ts).
export const dynamic = "force-dynamic";

export default async function ServicesAdminPage() {
  const services = await listAllServices();
  return <ServicesPageClient initialServices={services} />;
}
