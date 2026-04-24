import "server-only";

import { unstable_cache } from "next/cache";

import { sql } from "@/lib/db/client";
import type { Promotion } from "@/types";

/**
 * Акции (promotions): блок «Акции» на главной + промо-попап сверху.
 *
 * Публичные функции `listActivePromotions` / `listPopupPromotions` —
 * через `unstable_cache` (тег `promotions`). Админские (`listAll`,
 * CRUD) — без кеша; server action'ы инвалидируют тег.
 *
 * Активность: is_active = true И (valid_from is null OR valid_from <= now())
 *                              И (valid_to   is null OR valid_to   >= now()).
 */

export const PROMOTIONS_CACHE_TAG = "promotions";

interface PromotionRow {
  id: number;
  title: string;
  body: string;
  image_url: string | null;
  link_url: string | null;
  link_text: string | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  show_as_popup: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const listActiveCached = unstable_cache(
  async (): Promise<Promotion[]> => {
    try {
      const rows = await sql<PromotionRow[]>`
        SELECT *
        FROM promotions
        WHERE is_active = true
          AND (valid_from IS NULL OR valid_from <= NOW())
          AND (valid_to   IS NULL OR valid_to   >= NOW())
        ORDER BY sort_order ASC, id DESC
      `;
      return rows;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[promotions.listActive] DB read failed:", err);
      }
      return [];
    }
  },
  ["promotions-active"],
  { revalidate: 60, tags: [PROMOTIONS_CACHE_TAG] },
);

const listPopupCached = unstable_cache(
  async (): Promise<Promotion[]> => {
    try {
      const rows = await sql<PromotionRow[]>`
        SELECT *
        FROM promotions
        WHERE is_active = true
          AND show_as_popup = true
          AND (valid_from IS NULL OR valid_from <= NOW())
          AND (valid_to   IS NULL OR valid_to   >= NOW())
        ORDER BY sort_order ASC, id DESC
      `;
      return rows;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[promotions.listPopup] DB read failed:", err);
      }
      return [];
    }
  },
  ["promotions-popup"],
  { revalidate: 60, tags: [PROMOTIONS_CACHE_TAG] },
);

export async function listActivePromotions(): Promise<Promotion[]> {
  return listActiveCached();
}

export async function listPopupPromotions(): Promise<Promotion[]> {
  return listPopupCached();
}

export async function listAllPromotions(): Promise<Promotion[]> {
  try {
    const rows = await sql<PromotionRow[]>`
      SELECT *
      FROM promotions
      ORDER BY sort_order ASC, id DESC
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[promotions.listAll] DB read failed:", err);
    }
    return [];
  }
}

export async function getPromotion(id: number): Promise<Promotion | null> {
  const rows = await sql<PromotionRow[]>`
    SELECT * FROM promotions WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ?? null;
}

export interface PromotionInput {
  title: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  validFrom: string | null;
  validTo: string | null;
  isActive: boolean;
  showAsPopup: boolean;
  sortOrder: number;
}

export async function createPromotion(
  input: PromotionInput,
): Promise<Promotion> {
  const rows = await sql<PromotionRow[]>`
    INSERT INTO promotions (
      title, body, image_url, link_url, link_text,
      valid_from, valid_to, is_active, show_as_popup, sort_order
    )
    VALUES (
      ${input.title},
      ${input.body},
      ${input.imageUrl},
      ${input.linkUrl},
      ${input.linkText},
      ${input.validFrom},
      ${input.validTo},
      ${input.isActive},
      ${input.showAsPopup},
      ${input.sortOrder}
    )
    RETURNING *
  `;
  const row = rows[0];
  if (!row) throw new Error("Failed to insert promotions");
  return row;
}

export async function updatePromotion(
  id: number,
  input: PromotionInput,
): Promise<void> {
  await sql`
    UPDATE promotions
    SET title         = ${input.title},
        body          = ${input.body},
        image_url     = ${input.imageUrl},
        link_url      = ${input.linkUrl},
        link_text     = ${input.linkText},
        valid_from    = ${input.validFrom},
        valid_to      = ${input.validTo},
        is_active     = ${input.isActive},
        show_as_popup = ${input.showAsPopup},
        sort_order    = ${input.sortOrder},
        updated_at    = NOW()
    WHERE id = ${id}
  `;
}

export async function deletePromotion(id: number): Promise<string | null> {
  const rows = await sql<{ image_url: string | null }[]>`
    DELETE FROM promotions
    WHERE id = ${id}
    RETURNING image_url
  `;
  return rows[0]?.image_url ?? null;
}

/** Быстрый toggle поля show_as_popup. */
export async function setPromotionPopup(
  id: number,
  showAsPopup: boolean,
): Promise<void> {
  await sql`
    UPDATE promotions
    SET show_as_popup = ${showAsPopup},
        updated_at    = NOW()
    WHERE id = ${id}
  `;
}
