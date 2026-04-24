import "server-only";

import { unstable_cache } from "next/cache";

import { sql } from "@/lib/db/client";

/**
 * Data-layer для таблицы `page_metadata` (миграция 009).
 *
 * Чтения кешируются `unstable_cache` на 60 сек, тег `page-meta:<path>`
 * — в server actions после upsert вызываем `updateTag(`page-meta:${path}`)`.
 *
 * Никаких Zod-валидаций на этом уровне — структура контролируется
 * на уровне server action при сохранении.
 */

export interface PageMetadata {
  id: string;
  path: string;
  title: string | null;
  description: string | null;
  keywords: string[];
  ogImage: string | null;
  noindex: boolean;
  canonical: string | null;
  updatedAt: string;
}

interface PageMetadataRow {
  id: string;
  path: string;
  title: string | null;
  description: string | null;
  keywords: string[] | null;
  og_image: string | null;
  noindex: boolean;
  canonical: string | null;
  updated_at: string | Date;
}

function toPageMetadata(row: PageMetadataRow): PageMetadata {
  const raw: unknown = row.updated_at;
  return {
    id: row.id,
    path: row.path,
    title: row.title,
    description: row.description,
    keywords: row.keywords ?? [],
    ogImage: row.og_image,
    noindex: row.noindex,
    canonical: row.canonical,
    updatedAt: raw instanceof Date ? raw.toISOString() : String(raw),
  };
}

export function pageMetadataCacheTag(path: string): string {
  return `page-meta:${path}`;
}

async function readPageMetadata(path: string): Promise<PageMetadata | null> {
  try {
    const rows = await sql<PageMetadataRow[]>`
      SELECT id, path, title, description, keywords,
             og_image, noindex, canonical, updated_at
      FROM page_metadata
      WHERE path = ${path}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? toPageMetadata(row) : null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[page-metadata.getPageMetadata ${path}] DB read failed:`, err);
    }
    return null;
  }
}

/**
 * Кеш на путь — так же как в lib/data/cms.ts. `unstable_cache` мемоизирует
 * по сериализованным аргументам + ключу массиву, но чтобы тег был
 * per-path, создаём фабрику.
 */
type MetadataCacheFn = (p: string) => Promise<PageMetadata | null>;
const metadataCacheByPath = new Map<string, MetadataCacheFn>();

function makeMetadataCache(path: string): MetadataCacheFn {
  const existing = metadataCacheByPath.get(path);
  if (existing) return existing;
  const fn: MetadataCacheFn = unstable_cache(
    async (p: string) => readPageMetadata(p),
    ["page-metadata", path],
    { revalidate: 60, tags: [pageMetadataCacheTag(path)] },
  );
  metadataCacheByPath.set(path, fn);
  return fn;
}

/**
 * Возвращает SEO-мету для указанного пути или null.
 * Использовать в `generateMetadata()` серверных компонентов страниц.
 */
export async function getPageMetadata(
  path: string,
): Promise<PageMetadata | null> {
  return makeMetadataCache(path)(path);
}

/**
 * Возвращает все записи — для админки (список страниц).
 * Без кеша — админка и так обращается редко.
 */
export async function getAllPageMetadata(): Promise<PageMetadata[]> {
  try {
    const rows = await sql<PageMetadataRow[]>`
      SELECT id, path, title, description, keywords,
             og_image, noindex, canonical, updated_at
      FROM page_metadata
      ORDER BY path ASC
    `;
    return rows.map(toPageMetadata);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[page-metadata.getAllPageMetadata] DB read failed:", err);
    }
    return [];
  }
}

/**
 * Upsert по path. Возвращает обновлённую запись.
 * userId — для аудита (`updated_by`).
 */
export async function upsertPageMetadata(
  data: {
    path: string;
    title: string | null;
    description: string | null;
    keywords: string[];
    og_image: string | null;
    noindex: boolean;
    canonical: string | null;
  },
  userId: string | null,
): Promise<PageMetadata> {
  const rows = await sql<PageMetadataRow[]>`
    INSERT INTO page_metadata (
      path, title, description, keywords, og_image, noindex, canonical,
      updated_by, updated_at
    )
    VALUES (
      ${data.path},
      ${data.title},
      ${data.description},
      ${data.keywords},
      ${data.og_image},
      ${data.noindex},
      ${data.canonical},
      ${userId},
      NOW()
    )
    ON CONFLICT (path) DO UPDATE SET
      title       = EXCLUDED.title,
      description = EXCLUDED.description,
      keywords    = EXCLUDED.keywords,
      og_image    = EXCLUDED.og_image,
      noindex     = EXCLUDED.noindex,
      canonical   = EXCLUDED.canonical,
      updated_by  = EXCLUDED.updated_by,
      updated_at  = NOW()
    RETURNING id, path, title, description, keywords,
              og_image, noindex, canonical, updated_at
  `;
  const row = rows[0];
  if (!row) throw new Error(`Failed to upsert page_metadata.${data.path}`);
  return toPageMetadata(row);
}
