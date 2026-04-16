import { getPages } from "@/features/admin/api/pages";
import PagesPageClient from "@/features/admin/components/PagesPageClient";

export const metadata = { title: "Статические страницы" };

export default async function ContentPagesPage() {
  const pages = await getPages();

  return <PagesPageClient initialPages={pages} />;
}
