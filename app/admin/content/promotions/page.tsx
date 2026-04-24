import { listAllPromotions } from "@/lib/data/promotions";
import PromotionsPageClient from "@/features/admin/components/PromotionsPageClient";

export const metadata = { title: "Акции" };

export default async function PromotionsAdminPage() {
  const items = await listAllPromotions();
  return <PromotionsPageClient initialItems={items} />;
}
