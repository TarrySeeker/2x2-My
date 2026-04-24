"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/features/auth/api";
import {
  upsertPageMetadata,
  pageMetadataCacheTag,
} from "@/lib/data/page-metadata";
import {
  pageMetadataSchema,
  isAllowedPageMetadataPath,
} from "@/features/admin/schemas/page-metadata";
import { sql } from "@/lib/db/client";

/**
 * Server actions для `page_metadata` (SEO-мета страниц).
 *
 * Гард — `requireAdmin(["owner","manager","content"])`. SEO-тексты
 * редактирует и контент-менеджер.
 */

export interface PageMetadataActionResult {
  ok: boolean;
  error?: string;
}

export async function updatePageMetadataAction(
  rawPath: string,
  rawData: unknown,
): Promise<PageMetadataActionResult> {
  const profile = await requireAdmin(["owner", "manager", "content"]);

  if (typeof rawPath !== "string" || !isAllowedPageMetadataPath(rawPath)) {
    return { ok: false, error: `Неизвестная страница «${rawPath}»` };
  }

  // path в теле запроса должен совпадать с URL-путём из URL-сегмента
  // админки. Если фронт прислал другой path в payload — игнорим в пользу
  // rawPath (защита от подмены путей).
  const payload =
    rawData && typeof rawData === "object"
      ? { ...(rawData as Record<string, unknown>), path: rawPath }
      : { path: rawPath };

  const parsed = pageMetadataSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await upsertPageMetadata(
      {
        path: parsed.data.path,
        title: parsed.data.title ?? null,
        description: parsed.data.description ?? null,
        keywords: parsed.data.keywords ?? [],
        og_image: parsed.data.og_image ?? null,
        noindex: parsed.data.noindex,
        canonical: parsed.data.canonical ?? null,
      },
      profile.id,
    );

    updateTag(pageMetadataCacheTag(parsed.data.path));
    revalidatePath(parsed.data.path);
    revalidatePath("/admin/content/seo");

    try {
      await sql`
        SELECT log_admin_action(
          ${profile.id},
          'page_metadata.upsert',
          'page_metadata',
          ${parsed.data.path},
          NULL,
          ${sql.json(parsed.data as unknown as Parameters<typeof sql.json>[0])},
          NULL,
          NULL
        )
      `;
    } catch (auditErr) {
      console.warn("[page-metadata.updatePageMetadataAction] audit failed:", auditErr);
    }

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось сохранить метаданные";
    console.error(`[page-metadata.updatePageMetadataAction ${rawPath}]`, message);
    return { ok: false, error: message };
  }
}
