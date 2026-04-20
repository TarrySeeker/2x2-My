import "server-only";

import { sql } from "@/lib/db/client";
import type { Row } from "@/lib/db/table-types";
import type {
  SeoEntity,
  RedirectInput,
  SeoTemplates,
} from "@/features/admin/types";

type RedirectRow = Row<"redirects">;

// ── SEO entities ──

export async function getSeoEntities(
  type: "product" | "category" | "page" | "post",
): Promise<SeoEntity[]> {
  try {
    switch (type) {
      case "product": {
        type R = {
          id: number;
          name: string;
          slug: string;
          seo_title: string | null;
          seo_description: string | null;
        };
        const rows = await sql<R[]>`
          SELECT id, name, slug, seo_title, seo_description
          FROM products
          WHERE deleted_at IS NULL
          ORDER BY name ASC
        `;
        return rows.map((p: R) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          seo_title: p.seo_title,
          seo_description: p.seo_description,
          filled: !!(p.seo_title && p.seo_description),
        }));
      }

      case "category": {
        type R = {
          id: number;
          name: string;
          slug: string;
          seo_title: string | null;
          seo_description: string | null;
        };
        const rows = await sql<R[]>`
          SELECT id, name, slug, seo_title, seo_description
          FROM categories
          ORDER BY name ASC
        `;
        return rows.map((c: R) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          seo_title: c.seo_title,
          seo_description: c.seo_description,
          filled: !!(c.seo_title && c.seo_description),
        }));
      }

      case "page": {
        type R = {
          id: number;
          title: string;
          slug: string;
          seo_title: string | null;
          seo_description: string | null;
        };
        const rows = await sql<R[]>`
          SELECT id, title, slug, seo_title, seo_description
          FROM pages
          ORDER BY title ASC
        `;
        return rows.map((p: R) => ({
          id: p.id,
          name: p.title,
          slug: p.slug,
          seo_title: p.seo_title,
          seo_description: p.seo_description,
          filled: !!(p.seo_title && p.seo_description),
        }));
      }

      case "post": {
        type R = {
          id: number;
          title: string;
          slug: string;
          seo_title: string | null;
          seo_description: string | null;
        };
        const rows = await sql<R[]>`
          SELECT id, title, slug, seo_title, seo_description
          FROM blog_posts
          ORDER BY title ASC
        `;
        return rows.map((p: R) => ({
          id: p.id,
          name: p.title,
          slug: p.slug,
          seo_title: p.seo_title,
          seo_description: p.seo_description,
          filled: !!(p.seo_title && p.seo_description),
        }));
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getSeoEntities] DB request failed:", err);
    }
    return [];
  }
}

// ── Redirects ──

export async function getRedirects(): Promise<RedirectRow[]> {
  try {
    const rows = await sql<RedirectRow[]>`
      SELECT *
      FROM redirects
      ORDER BY created_at DESC
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getRedirects] DB request failed:", err);
    }
    return [];
  }
}

export async function createRedirect(
  data: RedirectInput,
): Promise<{ id: number }> {
  const rows = await sql<{ id: number }[]>`
    INSERT INTO redirects (from_path, to_path, type, is_active)
    VALUES (
      ${data.from_path},
      ${data.to_path},
      ${data.type},
      ${data.is_active}
    )
    RETURNING id
  `;
  const inserted = rows[0];
  if (!inserted) throw new Error("Не удалось создать редирект");
  return { id: inserted.id };
}

export async function updateRedirect(
  id: number,
  data: RedirectInput,
): Promise<void> {
  await sql`
    UPDATE redirects
    SET
      from_path = ${data.from_path},
      to_path = ${data.to_path},
      type = ${data.type},
      is_active = ${data.is_active}
    WHERE id = ${id}
  `;
}

export async function deleteRedirect(id: number): Promise<void> {
  await sql`DELETE FROM redirects WHERE id = ${id}`;
}

// ── SEO Templates (хранятся в settings) ──

export async function getSeoTemplates(): Promise<SeoTemplates> {
  try {
    const rows = await sql<{ key: string; value: unknown }[]>`
      SELECT key, value
      FROM settings
      WHERE key IN ('seo_title_template', 'seo_description_template')
    `;

    const templates: SeoTemplates = {
      seo_title_template: "",
      seo_description_template: "",
    };

    for (const row of rows) {
      if (row.key === "seo_title_template" && typeof row.value === "string") {
        templates.seo_title_template = row.value;
      }
      if (
        row.key === "seo_description_template" &&
        typeof row.value === "string"
      ) {
        templates.seo_description_template = row.value;
      }
    }

    return templates;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getSeoTemplates] DB request failed:", err);
    }
    return { seo_title_template: "", seo_description_template: "" };
  }
}

export async function saveSeoTemplates(
  templates: SeoTemplates,
): Promise<void> {
  const entries: { key: string; value: string; desc: string }[] = [
    {
      key: "seo_title_template",
      value: templates.seo_title_template,
      desc: "SEO шаблон заголовка",
    },
    {
      key: "seo_description_template",
      value: templates.seo_description_template,
      desc: "SEO шаблон описания",
    },
  ];

  for (const entry of entries) {
    await sql`
      INSERT INTO settings (key, value, description, is_public)
      VALUES (
        ${entry.key},
        ${sql.json(entry.value)},
        ${entry.desc},
        false
      )
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          description = EXCLUDED.description,
          is_public = EXCLUDED.is_public
    `;
  }
}
