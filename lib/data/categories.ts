import "server-only";

import { sql } from "@/lib/db/client";
import type { Category } from "@/types";

export async function getCategories(): Promise<Category[]> {
  try {
    const rows = await sql<Category[]>`
      SELECT *
      FROM categories
      WHERE is_active = true
      ORDER BY sort_order ASC
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getCategories] DB request failed:", err);
    }
    return [];
  }
}

export async function getCategoryBySlug(
  slug: string,
): Promise<Category | null> {
  try {
    const rows = await sql<Category[]>`
      SELECT *
      FROM categories
      WHERE slug = ${slug}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getCategoryBySlug] DB request failed:", err);
    }
    return null;
  }
}
