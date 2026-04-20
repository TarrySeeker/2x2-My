import "server-only";

import { sql } from "@/lib/db/client";
import type { SettingsUpdate } from "@/features/admin/types";

export async function getSettings(): Promise<Record<string, unknown>> {
  try {
    const rows = await sql<{ key: string; value: unknown }[]>`
      SELECT key, value
      FROM settings
      ORDER BY key ASC
    `;
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getSettings] DB request failed:", err);
    }
    return {};
  }
}

export async function updateSettings(
  updates: SettingsUpdate[],
): Promise<void> {
  for (const update of updates) {
    try {
      await sql`
        INSERT INTO settings (key, value, description, is_public)
        VALUES (
          ${update.key},
          ${sql.json(update.value ?? null)},
          NULL,
          false
        )
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value
      `;
    } catch (err) {
      throw new Error(
        `Не удалось обновить настройку «${update.key}»: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
