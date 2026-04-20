import "server-only";

import { sql } from "@/lib/db/client";
import type { Row } from "@/lib/db/table-types";
import type { PageInput } from "@/features/admin/types";

type PageRow = Row<"pages">;

export async function getPages(): Promise<PageRow[]> {
  try {
    const rows = await sql<PageRow[]>`
      SELECT *
      FROM pages
      ORDER BY sort_order ASC
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getPages] DB request failed:", err);
    }
    return [];
  }
}

export async function getPageById(id: number): Promise<PageRow | null> {
  try {
    const rows = await sql<PageRow[]>`
      SELECT * FROM pages WHERE id = ${id} LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getPageById] DB request failed:", err);
    }
    return null;
  }
}

export async function createPage(data: PageInput): Promise<{ id: number }> {
  const rows = await sql<{ id: number }[]>`
    INSERT INTO pages (
      title, slug, content, excerpt, cover_url,
      seo_title, seo_description, seo_keywords,
      is_active, show_in_footer, sort_order
    )
    VALUES (
      ${data.title},
      ${data.slug},
      ${data.content},
      ${data.excerpt ?? null},
      ${data.cover_url ?? null},
      ${data.seo_title ?? null},
      ${data.seo_description ?? null},
      ${data.seo_keywords ?? null},
      ${data.is_active},
      ${data.show_in_footer},
      ${data.sort_order}
    )
    RETURNING id
  `;
  const inserted = rows[0];
  if (!inserted) throw new Error("Не удалось создать страницу");
  return { id: inserted.id };
}

export async function updatePage(id: number, data: PageInput): Promise<void> {
  await sql`
    UPDATE pages
    SET
      title = ${data.title},
      slug = ${data.slug},
      content = ${data.content},
      excerpt = ${data.excerpt ?? null},
      cover_url = ${data.cover_url ?? null},
      seo_title = ${data.seo_title ?? null},
      seo_description = ${data.seo_description ?? null},
      seo_keywords = ${data.seo_keywords ?? null},
      is_active = ${data.is_active},
      show_in_footer = ${data.show_in_footer},
      sort_order = ${data.sort_order}
    WHERE id = ${id}
  `;
}

export async function deletePage(id: number): Promise<void> {
  await sql`DELETE FROM pages WHERE id = ${id}`;
}
