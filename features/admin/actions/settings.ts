"use server";

import { revalidatePath } from "next/cache";
import { updateSettings } from "@/features/admin/api/settings";
import { requireOwner } from "@/features/auth/api";
import { settingsUpdateSchema } from "@/features/admin/schemas/settings";
import type { Json } from "@/types/database";
import { logAdminAction } from "@/lib/audit";

export async function updateSettingsAction(data: unknown) {
  const profile = await requireOwner();
  const validated = settingsUpdateSchema.parse(data);
  const updates = validated.map((item) => ({
    key: item.key,
    value: item.value as Json,
  }));
  await updateSettings(updates);
  revalidatePath("/admin/settings");
  await logAdminAction(
    profile.id,
    "settings.update",
    "settings",
    null,
    { keys: validated.map((item) => item.key) },
  );
}
