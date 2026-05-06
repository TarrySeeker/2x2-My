import { getSeoEntities, getRedirects, getSeoTemplates } from "@/features/admin/api/seo";
import SeoPageClient from "@/features/admin/components/SeoPageClient";

export const metadata = { title: "SEO" };

// «Товары» и «Категории» удалены из SEO-таблицы 2026-05-06 вместе с
// разделом /admin/products: 2х2 продаёт услуги, не товары. Для услуг
// SEO-поля задаются прямо в карточке услуги (/admin/content/services).
export default async function SeoPage() {
  const [pages, posts, redirects, templates] = await Promise.all([
    getSeoEntities("page"),
    getSeoEntities("post"),
    getRedirects(),
    getSeoTemplates(),
  ]);

  return (
    <SeoPageClient
      initialEntities={{
        page: pages,
        post: posts,
      }}
      initialRedirects={redirects}
      initialTemplates={templates}
    />
  );
}
