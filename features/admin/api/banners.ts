import "server-only";

import { sql, type Tx } from "@/lib/db/client";
import type { Row } from "@/lib/db/table-types";
import type { BannerInput } from "@/features/admin/types";

type BannerRow = Row<"banners">;

export async function getBanners(): Promise<BannerRow[]> {
  try {
    const rows = await sql<BannerRow[]>`
      SELECT *
      FROM banners
      ORDER BY sort_order ASC
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getBanners] DB request failed:", err);
    }
    return [];
  }
}

export async function createBanner(
  data: BannerInput,
): Promise<{ id: number }> {
  const lastRows = await sql<{ sort_order: number }[]>`
    SELECT sort_order
    FROM banners
    ORDER BY sort_order DESC
    LIMIT 1
  `;
  const nextOrder = (lastRows[0]?.sort_order ?? 0) + 1;

  const rows = await sql<{ id: number }[]>`
    INSERT INTO banners (
      title, subtitle, description, image_url, mobile_image_url,
      link, button_text, badge, position, sort_order, is_active,
      active_from, active_to
    )
    VALUES (
      ${data.title ?? null},
      ${data.subtitle ?? null},
      ${data.description ?? null},
      ${data.image_url},
      ${data.mobile_image_url ?? null},
      ${data.link ?? null},
      ${data.button_text ?? null},
      ${data.badge ?? null},
      ${data.position},
      ${nextOrder},
      ${data.is_active},
      ${data.active_from ?? null},
      ${data.active_to ?? null}
    )
    RETURNING id
  `;
  const inserted = rows[0];
  if (!inserted) throw new Error("Не удалось создать баннер");
  return { id: inserted.id };
}

export async function updateBanner(
  id: number,
  data: BannerInput,
): Promise<void> {
  await sql`
    UPDATE banners
    SET
      title = ${data.title ?? null},
      subtitle = ${data.subtitle ?? null},
      description = ${data.description ?? null},
      image_url = ${data.image_url},
      mobile_image_url = ${data.mobile_image_url ?? null},
      link = ${data.link ?? null},
      button_text = ${data.button_text ?? null},
      badge = ${data.badge ?? null},
      position = ${data.position},
      is_active = ${data.is_active},
      active_from = ${data.active_from ?? null},
      active_to = ${data.active_to ?? null}
    WHERE id = ${id}
  `;
}

export async function deleteBanner(id: number): Promise<void> {
  await sql`DELETE FROM banners WHERE id = ${id}`;
}

export async function reorderBanners(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await sql.begin(async (tx: Tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx`UPDATE banners SET sort_order = ${i} WHERE id = ${ids[i]}`;
    }
  });
}
