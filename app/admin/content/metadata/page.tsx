import { getAllPageMetadata } from "@/lib/data/page-metadata";
import { PAGE_METADATA_ALLOWED_PATHS } from "@/features/admin/schemas/page-metadata";
import PageMetadataClient, {
  type PageMetadataRow,
} from "@/features/admin/components/PageMetadataClient";

export const metadata = { title: "SEO: мета-теги страниц" };

/**
 * Админ-страница /admin/content/metadata — SEO метаданные каждой
 * публичной страницы сайта (таблица page_metadata, миграция 009).
 *
 * Показывает полный whitelist допустимых путей; для тех, у которых ещё
 * нет записи в БД, даёт создать её через «Добавить».
 */
export default async function MetadataAdminPage() {
  const stored = await getAllPageMetadata();
  const storedByPath = new Map(stored.map((s) => [s.path, s]));

  const rows: PageMetadataRow[] = PAGE_METADATA_ALLOWED_PATHS.map((path) => {
    const meta = storedByPath.get(path);
    return {
      path,
      title: meta?.title ?? null,
      description: meta?.description ?? null,
      keywords: meta?.keywords ?? [],
      ogImage: meta?.ogImage ?? null,
      canonical: meta?.canonical ?? null,
      noindex: meta?.noindex ?? false,
      updatedAt: meta?.updatedAt ?? null,
      exists: Boolean(meta),
    };
  });

  return <PageMetadataClient rows={rows} />;
}
