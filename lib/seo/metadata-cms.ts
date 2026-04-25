/**
 * Хелпер для `generateMetadata()` страниц с CMS-подпиткой.
 *
 * Читает `page_metadata(path)` из БД и перекрывает поля fallback-SEO
 * (текущие hardcoded-значения из `buildMetadata(...)`). Всегда возвращает
 * валидные Metadata — если БД пустая/недоступна, используются fallback-ы.
 *
 * Использование в серверном компоненте страницы:
 *   ```ts
 *   import { makeGenerateMetadata } from "@/lib/seo/metadata-cms";
 *   export const generateMetadata = makeGenerateMetadata({
 *     path: "/about",
 *     fallback: {
 *       title: "О компании ...",
 *       description: "...",
 *       keywords: [...],
 *     },
 *   });
 *   ```
 */
import type { Metadata } from "next";

import { buildMetadata, type SeoInput } from "@/lib/seo/metadata";
import { getPageMetadata } from "@/lib/data/page-metadata";
import { getOrganization } from "@/lib/cms/organization";

export interface MakeGenerateMetadataInput {
  /** Путь в `page_metadata` (совпадает с URL). */
  path: string;
  /** Дефолтные SEO-значения — если в БД нет записи. */
  fallback: Omit<SeoInput, "path" | "image"> & {
    image?: string;
  };
}

/**
 * Возвращает функцию `generateMetadata`, которую нужно ре-экспортировать
 * из `app/<route>/page.tsx` (`export const generateMetadata = ...`).
 *
 * Приоритет полей:
 *   cms.title || fallback.title
 *   cms.description || fallback.description
 *   cms.keywords (если непустой) || fallback.keywords
 *   cms.noindex (если есть cms) || fallback.noindex
 *   cms.canonical → alternates.canonical (override после buildMetadata)
 *   cms.ogImage → openGraph.images[0].url  (image override)
 */
export function makeGenerateMetadata(
  opts: MakeGenerateMetadataInput,
): () => Promise<Metadata> {
  return async function generateMetadata(): Promise<Metadata> {
    // Параллельное чтение: per-path SEO override + глобальные настройки
    // организации. Оба независимы, поэтому Promise.all безопасен.
    const [cms, org] = await Promise.all([
      getPageMetadata(opts.path),
      getOrganization(),
    ]);

    // Приоритет: page_metadata > организация > fallback
    const title =
      (cms?.title && cms.title.trim().length > 0 && cms.title) ||
      opts.fallback.title;
    const description =
      (cms?.description && cms.description.trim().length > 0 && cms.description) ||
      org.description ||
      opts.fallback.description;
    const keywords =
      cms?.keywords && cms.keywords.length > 0
        ? cms.keywords
        : org.keywords_global.length > 0
          ? org.keywords_global
          : opts.fallback.keywords;
    const noindex =
      typeof cms?.noindex === "boolean" ? cms.noindex : opts.fallback.noindex;
    const image =
      (cms?.ogImage && cms.ogImage.trim().length > 0 && cms.ogImage) ||
      org.og_image ||
      opts.fallback.image;

    const base = buildMetadata({
      ...opts.fallback,
      path: opts.path,
      title,
      description,
      keywords,
      noindex,
      ...(image ? { image } : {}),
      siteName: org.name,
      locale: org.locale,
    });

    // canonical из CMS перекрывает canonical, собранный из path.
    if (cms?.canonical && cms.canonical.trim().length > 0) {
      return {
        ...base,
        alternates: {
          ...(base.alternates ?? {}),
          canonical: cms.canonical,
        },
      };
    }

    return base;
  };
}
