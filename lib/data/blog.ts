import "server-only";

import { unstable_cache } from "next/cache";

import { sql } from "@/lib/db/client";
import type { BlogPost } from "@/types";

/**
 * Публичные (server-only) data-loader'ы для блога.
 *
 * Админская версия `getBlogPosts(filters)` живёт в
 * `features/admin/api/blog.ts` — там другой контракт (фильтры, пагинация,
 * join авторов/категорий). Здесь — лёгкие выборки для публичных страниц
 * и sitemap'а.
 *
 * Все функции безопасны к недоступной БД: при ошибке возвращают пустой
 * массив / null и логируют предупреждение в dev. Sitemap/страницы в этом
 * случае деградируют до fallback'ов на стороне вызова.
 *
 * Кеш: `unstable_cache` 60 сек, тег `BLOG_POSTS_CACHE_TAG`. Админские
 * server actions (`features/admin/actions/blog.ts`) дёргают
 * `revalidateTag(BLOG_POSTS_CACHE_TAG)` после CUD.
 */

export const BLOG_POSTS_CACHE_TAG = "blog:posts";

/**
 * Минимальный набор полей, необходимых для sitemap'а и превью-списков.
 * Используем узкий тип, чтобы не таскать большие `content` поля.
 */
export interface BlogPostSitemapEntry {
  slug: string;
  updated_at: string;
  published_at: string | null;
}

/**
 * Возвращает опубликованные статьи блога (минимум полей для sitemap).
 * Сортировка: свежие сверху. При ошибке БД — пустой массив.
 */
export async function getPublishedBlogPostsForSitemap(): Promise<
  BlogPostSitemapEntry[]
> {
  try {
    const rows = await sql<BlogPostSitemapEntry[]>`
      SELECT slug, updated_at, published_at
      FROM blog_posts
      WHERE status = 'published'
        AND (published_at IS NULL OR published_at <= NOW())
      ORDER BY COALESCE(published_at, updated_at) DESC
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[getPublishedBlogPostsForSitemap] DB request failed:",
        err,
      );
    }
    return [];
  }
}

/**
 * Возвращает опубликованные статьи блога полностью — для публичных
 * страниц листинга. При ошибке/пустоте — пустой массив, дальше fallback
 * остаётся на стороне вызова (см. `app/blog/page.tsx`, который при пустом
 * ответе показывает `content/blog-starters.ts`).
 */
const listPublishedCached = unstable_cache(
  async (): Promise<BlogPost[]> => {
    try {
      const rows = await sql<BlogPost[]>`
        SELECT *
        FROM blog_posts
        WHERE status = 'published'
          AND (published_at IS NULL OR published_at <= NOW())
        ORDER BY COALESCE(published_at, updated_at) DESC
      `;
      return rows;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[getPublishedBlogPosts] DB request failed:", err);
      }
      return [];
    }
  },
  ["blog-published"],
  { revalidate: 60, tags: [BLOG_POSTS_CACHE_TAG] },
);

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  return listPublishedCached();
}

/**
 * Возвращает один опубликованный пост по slug. При ошибке/отсутствии
 * — `null`. Используется в `app/blog/[slug]/page.tsx`. Drafts не
 * выдаются никогда (фильтр `status = 'published'`).
 *
 * Кеширование вынесено в обёртку фабрики (как в `lib/data/cms.ts`):
 * один `unstable_cache` на slug, чтобы избежать «общей» инвалидации
 * по всем slug'ам при изменении одного поста.
 */
type BlogPostBySlugFn = () => Promise<BlogPost | null>;
const slugCacheMap = new Map<string, BlogPostBySlugFn>();

function buildBySlugCache(slug: string): BlogPostBySlugFn {
  return unstable_cache(
    async () => {
      try {
        const rows = await sql<BlogPost[]>`
          SELECT *
          FROM blog_posts
          WHERE slug = ${slug}
            AND status = 'published'
            AND (published_at IS NULL OR published_at <= NOW())
          LIMIT 1
        `;
        return rows[0] ?? null;
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[getBlogPostBySlug] DB request failed (slug=${slug}):`,
            err,
          );
        }
        return null;
      }
    },
    ["blog-post-by-slug", slug],
    { revalidate: 60, tags: [BLOG_POSTS_CACHE_TAG] },
  );
}

export async function getBlogPostBySlug(
  slug: string,
): Promise<BlogPost | null> {
  if (!slug || typeof slug !== "string") return null;
  let fn = slugCacheMap.get(slug);
  if (!fn) {
    fn = buildBySlugCache(slug);
    slugCacheMap.set(slug, fn);
  }
  return fn();
}
