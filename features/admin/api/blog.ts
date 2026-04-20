import "server-only";

import { sql, type Tx } from "@/lib/db/client";
import type { Row } from "@/lib/db/table-types";
import type {
  BlogPostFilters,
  BlogPostFull,
  BlogPostInput,
  BlogCategoryInput,
} from "@/features/admin/types";

type BlogPostRow = Row<"blog_posts">;
type BlogCategoryRow = Row<"blog_categories">;

// ── Blog Posts ──

export async function getBlogPosts(
  filters: BlogPostFilters,
): Promise<{ data: BlogPostFull[]; total: number }> {
  try {
    const { page, perPage, search, status, category_id } = filters;
    const offset = (page - 1) * perPage;
    const like = search ? `%${search}%` : null;
    const statusArg = (status ?? null) as string | null;
    const catArg = category_id ?? null;

    const totalRows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM blog_posts
      WHERE (${statusArg}::text IS NULL OR status::text = ${statusArg})
        AND (${catArg}::bigint IS NULL OR category_id = ${catArg})
        AND (${like}::text IS NULL OR title ILIKE ${like})
    `;
    const total = totalRows[0]?.count ?? 0;

    const posts = await sql<BlogPostRow[]>`
      SELECT *
      FROM blog_posts
      WHERE (${statusArg}::text IS NULL OR status::text = ${statusArg})
        AND (${catArg}::bigint IS NULL OR category_id = ${catArg})
        AND (${like}::text IS NULL OR title ILIKE ${like})
      ORDER BY created_at DESC
      LIMIT ${perPage}
      OFFSET ${offset}
    `;

    if (posts.length === 0) return { data: [], total };

    const categoryIds = [
      ...new Set(
        posts.map((p: BlogPostRow) => p.category_id).filter(Boolean),
      ),
    ] as number[];
    const authorIds = [
      ...new Set(
        posts.map((p: BlogPostRow) => p.author_id).filter(Boolean),
      ),
    ] as string[];

    const categoryMap = new Map<number, string>();
    const authorMap = new Map<string, string>();

    if (categoryIds.length > 0) {
      const cats = await sql<{ id: number; name: string }[]>`
        SELECT id, name
        FROM blog_categories
        WHERE id IN ${sql(categoryIds)}
      `;
      for (const c of cats) categoryMap.set(c.id, c.name);
    }

    if (authorIds.length > 0) {
      const authors = await sql<
        { id: string; full_name: string | null }[]
      >`
        SELECT id, full_name
        FROM users
        WHERE id IN ${sql(authorIds)}
      `;
      for (const a of authors) authorMap.set(a.id, a.full_name ?? a.id);
    }

    const result: BlogPostFull[] = posts.map((post: BlogPostRow) => ({
      ...post,
      category_name: post.category_id
        ? (categoryMap.get(post.category_id) ?? null)
        : null,
      author_full_name: post.author_id
        ? (authorMap.get(post.author_id) ?? null)
        : null,
    }));

    return { data: result, total };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getBlogPosts] DB request failed:", err);
    }
    return { data: [], total: 0 };
  }
}

export async function getBlogPostById(id: number): Promise<BlogPostFull | null> {
  try {
    const rows = await sql<BlogPostRow[]>`
      SELECT * FROM blog_posts WHERE id = ${id} LIMIT 1
    `;
    const post = rows[0];
    if (!post) return null;

    let category_name: string | null = null;
    let author_full_name: string | null = null;

    if (post.category_id) {
      const catRows = await sql<{ name: string }[]>`
        SELECT name FROM blog_categories WHERE id = ${post.category_id} LIMIT 1
      `;
      category_name = catRows[0]?.name ?? null;
    }

    if (post.author_id) {
      const authorRows = await sql<{ full_name: string | null }[]>`
        SELECT full_name FROM users WHERE id = ${post.author_id} LIMIT 1
      `;
      author_full_name = authorRows[0]?.full_name ?? null;
    }

    return { ...post, category_name, author_full_name };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getBlogPostById] DB request failed:", err);
    }
    return null;
  }
}

export async function createBlogPost(
  data: BlogPostInput,
  authorId: string,
): Promise<{ id: number }> {
  const published_at =
    data.status === "published"
      ? (data.published_at ?? new Date().toISOString())
      : (data.published_at ?? null);

  const rows = await sql<{ id: number }[]>`
    INSERT INTO blog_posts (
      title, slug, excerpt, content, cover_image_url,
      category_id, author_id, author_name, status, published_at,
      seo_title, seo_description, seo_keywords, reading_time, tags
    )
    VALUES (
      ${data.title},
      ${data.slug},
      ${data.excerpt ?? null},
      ${data.content},
      ${data.cover_image_url ?? null},
      ${data.category_id ?? null},
      ${authorId},
      NULL,
      ${data.status},
      ${published_at},
      ${data.seo_title ?? null},
      ${data.seo_description ?? null},
      ${data.seo_keywords ?? null},
      ${data.reading_time ?? null},
      ${data.tags ?? []}
    )
    RETURNING id
  `;

  const inserted = rows[0];
  if (!inserted) throw new Error("Не удалось создать статью");
  return { id: inserted.id };
}

export async function updateBlogPost(
  id: number,
  data: BlogPostInput,
): Promise<void> {
  const published_at =
    data.status === "published"
      ? (data.published_at ?? new Date().toISOString())
      : (data.published_at ?? null);

  await sql`
    UPDATE blog_posts
    SET
      title = ${data.title},
      slug = ${data.slug},
      excerpt = ${data.excerpt ?? null},
      content = ${data.content},
      cover_image_url = ${data.cover_image_url ?? null},
      category_id = ${data.category_id ?? null},
      status = ${data.status},
      published_at = ${published_at},
      seo_title = ${data.seo_title ?? null},
      seo_description = ${data.seo_description ?? null},
      seo_keywords = ${data.seo_keywords ?? null},
      reading_time = ${data.reading_time ?? null},
      tags = ${data.tags ?? []}
    WHERE id = ${id}
  `;
}

export async function deleteBlogPost(id: number): Promise<void> {
  await sql`DELETE FROM blog_posts WHERE id = ${id}`;
}

// ── Blog Categories ──

export async function getBlogCategories(): Promise<BlogCategoryRow[]> {
  try {
    const rows = await sql<BlogCategoryRow[]>`
      SELECT *
      FROM blog_categories
      ORDER BY sort_order ASC
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getBlogCategories] DB request failed:", err);
    }
    return [];
  }
}

export async function createBlogCategory(
  data: BlogCategoryInput,
): Promise<{ id: number }> {
  const rows = await sql<{ id: number }[]>`
    INSERT INTO blog_categories (name, slug, description, sort_order)
    VALUES (
      ${data.name},
      ${data.slug},
      ${data.description ?? null},
      ${data.sort_order}
    )
    RETURNING id
  `;
  const inserted = rows[0];
  if (!inserted) throw new Error("Не удалось создать категорию блога");
  return { id: inserted.id };
}

export async function updateBlogCategory(
  id: number,
  data: BlogCategoryInput,
): Promise<void> {
  await sql`
    UPDATE blog_categories
    SET
      name = ${data.name},
      slug = ${data.slug},
      description = ${data.description ?? null},
      sort_order = ${data.sort_order}
    WHERE id = ${id}
  `;
}

export async function deleteBlogCategory(id: number): Promise<void> {
  await sql.begin(async (tx: Tx) => {
    await tx`
      UPDATE blog_posts
      SET category_id = NULL
      WHERE category_id = ${id}
    `;
    await tx`DELETE FROM blog_categories WHERE id = ${id}`;
  });
}
