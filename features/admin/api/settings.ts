import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { SettingsUpdate } from "@/features/admin/types";

// ── Get all settings ──

export async function getSettings(): Promise<Record<string, unknown>> {
  if (!isSupabaseConfigured()) return {};

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("settings")
    .select("key, value")
    .order("key", { ascending: true });

  const result: Record<string, unknown> = {};
  for (const row of data ?? []) {
    result[row.key] = row.value;
  }

  return result;
}

// ── Update settings ──

export async function updateSettings(
  updates: SettingsUpdate[],
): Promise<void> {
  const supabase = createAdminClient();

  for (const update of updates) {
    const { error } = await supabase
      .from("settings")
      .upsert(
        {
          key: update.key,
          value: update.value,
          description: null,
          is_public: false,
        },
        { onConflict: "key" },
      );

    if (error) {
      throw new Error(`Не удалось обновить настройку «${update.key}»: ${error.message}`);
    }
  }
}
