import { getSeoEntities, getRedirects, getSeoTemplates } from "@/features/admin/api/seo";
import SeoPageClient from "@/features/admin/components/SeoPageClient";

export const metadata = { title: "SEO" };

export default async function SeoPage() {
  const [products, categories, pages, posts, redirects, templates] =
    await Promise.all([
      getSeoEntities("product"),
      getSeoEntities("category"),
      getSeoEntities("page"),
      getSeoEntities("post"),
      getRedirects(),
      getSeoTemplates(),
    ]);

  return (
    <SeoPageClient
      initialEntities={{
        product: products,
        category: categories,
        page: pages,
        post: posts,
      }}
      initialRedirects={redirects}
      initialTemplates={templates}
    />
  );
}
