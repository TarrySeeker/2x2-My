"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/features/auth/api";
import { upsertSetting } from "@/lib/data/settings";
import {
  isValidSiteSettingKey,
  getSiteSettingSchema,
  type SiteSettingKey,
} from "@/features/admin/schemas/site-settings";
import { sql } from "@/lib/db/client";

/**
 * Server actions для site_settings (глобальные настройки сайта).
 *
 * НЕ путать с `actions/settings.ts` — там старые store_*-настройки.
 */

export interface UpdateSiteSettingResult {
  ok: boolean;
  error?: string;
}

export async function updateSiteSettingAction(
  rawKey: string,
  valueJson: unknown,
): Promise<UpdateSiteSettingResult> {
  const profile = await requireAdmin();

  if (typeof rawKey !== "string" || !isValidSiteSettingKey(rawKey)) {
    return { ok: false, error: `Неизвестная настройка «${rawKey}»` };
  }
  const key: SiteSettingKey = rawKey;

  const schema = getSiteSettingSchema(key);
  const parsed = schema.safeParse(valueJson);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await upsertSetting(
      key,
      parsed.data as Record<string, unknown>,
      profile.id,
    );

    updateTag(`settings:${key}`);
    revalidatePath("/");
    revalidatePath("/contacts");
    revalidatePath("/about");
    revalidatePath("/admin/content/settings");

    try {
      await sql`
        SELECT log_admin_action(
          ${profile.id},
          'settings.upsert',
          'site_settings',
          ${key},
          NULL,
          ${sql.json(parsed.data as unknown as Parameters<typeof sql.json>[0])},
          NULL,
          NULL
        )
      `;
    } catch (auditErr) {
      console.warn("[updateSiteSettingAction] audit failed:", auditErr);
    }

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось сохранить настройку";
    console.error(`[updateSiteSettingAction ${key}]`, message);
    return { ok: false, error: message };
  }
}
