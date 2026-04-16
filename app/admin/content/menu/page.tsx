import { getMenuItems } from "@/features/admin/api/menu";
import MenuPageClient from "@/features/admin/components/MenuPageClient";

export const metadata = { title: "Меню" };

export default async function MenuPage() {
  const [headerItems, footerItems] = await Promise.all([
    getMenuItems("header"),
    getMenuItems("footer"),
  ]);

  return (
    <MenuPageClient
      initialHeaderItems={headerItems}
      initialFooterItems={footerItems}
    />
  );
}
