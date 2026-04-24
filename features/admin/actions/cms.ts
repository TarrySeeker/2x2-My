"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/features/auth/api";
import { upsertSection, setSectionPublished } from "@/lib/data/cms";
import {
  isValidSectionKey,
  getSectionSchema,
  type SectionKey,
} from "@/features/admin/schemas/cms";
import { sql } from "@/lib/db/client";

/**
 * Server actions для CMS-секций главной (`homepage_sections`).
 *
 * Гард — `requireAdmin()` (owner или manager). Контент-менеджер
 * к секциям главной не пускается (это маркетинговый контент сайта,
 * не блог).
 *
 * Audit — пишем в `audit_log` через RPC `log_admin_action`.
 */

export interface UpdateSectionResult {
  ok: boolean;
  error?: string;
}

export async function updateSectionAction(
  rawKey: string,
  contentJson: unknown,
): Promise<UpdateSectionResult> {
  const profile = await requireAdmin();

  if (typeof rawKey !== "string" || !isValidSectionKey(rawKey)) {
    return { ok: false, error: `Неизвестная секция «${rawKey}»` };
  }
  const key: SectionKey = rawKey;

  const schema = getSectionSchema(key);
  const parsed = schema.safeParse(contentJson);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await upsertSection(
      key,
      parsed.data as Record<string, unknown>,
      profile.id,
    );

    // Кеш и пути. updateTag — Next 16 API для server actions
    // (read-your-own-writes), эквивалент legacy revalidateTag(tag).
    updateTag(`cms:${key}`);
    revalidatePath("/");
    revalidatePath("/admin/content/homepage");

    // Audit.
    try {
      await sql`
        SELECT log_admin_action(
          ${profile.id},
          'cms.upsert_section',
          'homepage_sections',
          ${key},
          NULL,
          ${sql.json(parsed.data as unknown as Parameters<typeof sql.json>[0])},
          NULL,
          NULL
        )
      `;
    } catch (auditErr) {
      console.warn("[cms.updateSectionAction] audit failed:", auditErr);
    }

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось сохранить секцию";
    console.error(`[cms.updateSectionAction ${key}]`, message);
    return { ok: false, error: message };
  }
}

export async function setSectionPublishedAction(
  rawKey: string,
  isPublished: boolean,
): Promise<UpdateSectionResult> {
  const profile = await requireAdmin();

  if (typeof rawKey !== "string" || !isValidSectionKey(rawKey)) {
    return { ok: false, error: `Неизвестная секция «${rawKey}»` };
  }
  const key: SectionKey = rawKey;

  try {
    await setSectionPublished(key, isPublished, profile.id);
    updateTag(`cms:${key}`);
    revalidatePath("/");
    revalidatePath("/admin/content/homepage");
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить статус";
    return { ok: false, error: message };
  }
}
