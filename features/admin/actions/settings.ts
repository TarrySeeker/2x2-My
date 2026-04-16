"use server";

import { revalidatePath } from "next/cache";
import { updateSettings } from "@/features/admin/api/settings";
import { requireAdmin } from "@/features/auth/api";
import { settingsUpdateSchema } from "@/features/admin/schemas/settings";
import type { Json } from "@/types/database";

export async function updateSettingsAction(data: unknown) {
  await requireAdmin();
  const validated = settingsUpdateSchema.parse(data);
  const updates = validated.map((item) => ({
    key: item.key,
    value: item.value as Json,
  }));
  await updateSettings(updates);
  revalidatePath("/admin/settings");
}
