import "server-only";

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
 * массив и логируют предупреждение в dev. Sitemap/страницы в этом случае
 * деградируют до fallback'ов на стороне вызова.
 */

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
 * страниц листинга. Оставляем для будущего использования; пока sitemap
 * использует только `…ForSitemap`.
 */
export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
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
}
