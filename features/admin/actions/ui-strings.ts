"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireResource } from "@/features/auth/api";
import {
  updateUiString,
  updateUiStringsBulk,
  UI_STRINGS_CACHE_TAG,
} from "@/lib/data/ui-strings";
import {
  uiStringUpdateSchema,
  uiStringsBulkUpdateSchema,
} from "@/features/admin/schemas/ui-strings";
import { sql } from "@/lib/db/client";

/**
 * Server actions для `ui_strings` (микротексты UI).
 *
 * Гард — `requireAdmin(["owner","manager","content"])`. Контент-менеджер
 * полностью распоряжается текстами.
 *
 * Каждое обновление инвалидирует глобальный тег `ui-strings` (весь словарь
 * кешируется одним снимком в data-layer).
 */

export interface UiStringActionResult {
  ok: boolean;
  error?: string;
  updated?: number;
}

// ============================================================
// updateUiStringAction — одиночная правка
// ============================================================

export async function updateUiStringAction(
  rawKey: string,
  rawValue: string,
): Promise<UiStringActionResult> {
  const profile = await requireResource("content.cms");

  const parsed = uiStringUpdateSchema.safeParse({
    key: rawKey,
    value: rawValue,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    const updated = await updateUiString(
      parsed.data.key,
      parsed.data.value,
      profile.id,
    );
    if (!updated) {
      return {
        ok: false,
        error: `Строка «${parsed.data.key}» не найдена`,
      };
    }

    updateTag(UI_STRINGS_CACHE_TAG);
    revalidatePath("/", "layout");
    revalidatePath("/admin/content/ui-strings");

    try {
      await sql`
        SELECT log_admin_action(
          ${profile.id},
          'ui_strings.update',
          'ui_strings',
          ${parsed.data.key},
          NULL,
          ${sql.json({ value: parsed.data.value } as unknown as Parameters<typeof sql.json>[0])},
          NULL,
          NULL
        )
      `;
    } catch (auditErr) {
      console.warn("[ui-strings.update] audit failed:", auditErr);
    }

    return { ok: true, updated: 1 };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось сохранить строку";
    console.error(`[ui-strings.update ${rawKey}]`, message);
    return { ok: false, error: message };
  }
}

// ============================================================
// bulkUpdateUiStringsAction — массовая правка
// ============================================================

export async function bulkUpdateUiStringsAction(
  updates: Array<{ key: string; value: string }>,
): Promise<UiStringActionResult> {
  const profile = await requireResource("content.cms");

  const parsed = uiStringsBulkUpdateSchema.safeParse(updates);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  if (parsed.data.length === 0) {
    return { ok: true, updated: 0 };
  }

  // Дедуплицируем по key (если фронт прислал дубли — берём последний value).
  const dedup = new Map<string, string>();
  for (const u of parsed.data) dedup.set(u.key, u.value);
  const final = Array.from(dedup.entries()).map(([key, value]) => ({
    key,
    value,
  }));

  try {
    const count = await updateUiStringsBulk(final, profile.id);

    updateTag(UI_STRINGS_CACHE_TAG);
    revalidatePath("/", "layout");
    revalidatePath("/admin/content/ui-strings");

    try {
      await sql`
        SELECT log_admin_action(
          ${profile.id},
          'ui_strings.bulk_update',
          'ui_strings',
          NULL,
          NULL,
          ${sql.json({ count, keys: final.map((f) => f.key) } as unknown as Parameters<typeof sql.json>[0])},
          NULL,
          NULL
        )
      `;
    } catch (auditErr) {
      console.warn("[ui-strings.bulk_update] audit failed:", auditErr);
    }

    return { ok: true, updated: count };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось сохранить строки";
    console.error("[ui-strings.bulk_update]", message);
    return { ok: false, error: message };
  }
}
