import { getBanners } from "@/features/admin/api/banners";
import BannersPageClient from "@/features/admin/components/BannersPageClient";

export const metadata = { title: "Баннеры" };

export default async function BannersPage() {
  const banners = await getBanners();

  return <BannersPageClient initialBanners={banners} />;
}
