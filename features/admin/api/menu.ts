import "server-only";

import { sql, type Tx } from "@/lib/db/client";
import type { Row } from "@/lib/db/table-types";
import type { MenuItemInput } from "@/features/admin/types";

type MenuItemRow = Row<"menu_items">;

export async function getMenuItems(
  position: "header" | "footer",
): Promise<MenuItemRow[]> {
  try {
    const rows = await sql<MenuItemRow[]>`
      SELECT *
      FROM menu_items
      WHERE position = ${position}
      ORDER BY sort_order ASC
    `;
    return rows;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getMenuItems] DB request failed:", err);
    }
    return [];
  }
}

export async function createMenuItem(
  data: MenuItemInput,
): Promise<{ id: number }> {
  const rows = await sql<{ id: number }[]>`
    INSERT INTO menu_items (
      parent_id, position, title, url, icon,
      sort_order, is_active, open_in_new_tab
    )
    VALUES (
      ${data.parent_id ?? null},
      ${data.position},
      ${data.title},
      ${data.url},
      ${data.icon ?? null},
      ${data.sort_order},
      ${data.is_active},
      ${data.open_in_new_tab}
    )
    RETURNING id
  `;
  const inserted = rows[0];
  if (!inserted) throw new Error("Не удалось создать пункт меню");
  return { id: inserted.id };
}

export async function updateMenuItem(
  id: number,
  data: MenuItemInput,
): Promise<void> {
  await sql`
    UPDATE menu_items
    SET
      parent_id = ${data.parent_id ?? null},
      position = ${data.position},
      title = ${data.title},
      url = ${data.url},
      icon = ${data.icon ?? null},
      sort_order = ${data.sort_order},
      is_active = ${data.is_active},
      open_in_new_tab = ${data.open_in_new_tab}
    WHERE id = ${id}
  `;
}

export async function deleteMenuItem(id: number): Promise<void> {
  await sql`DELETE FROM menu_items WHERE id = ${id}`;
}

export async function reorderMenuItems(
  position: string,
  ids: number[],
): Promise<void> {
  if (ids.length === 0) return;
  await sql.begin(async (tx: Tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx`
        UPDATE menu_items
        SET sort_order = ${i}
        WHERE id = ${ids[i]}
          AND position = ${position}
      `;
    }
  });
}
