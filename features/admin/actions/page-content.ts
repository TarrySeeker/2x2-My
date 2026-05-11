"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireResource } from "@/features/auth/api";
import {
  upsertPageContent,
  pageContentCacheTag,
} from "@/lib/data/page-content";
import {
  pageContentSchema,
  isAllowedPageContentPath,
} from "@/features/admin/schemas/page-content";
import { sql } from "@/lib/db/client";

/**
 * Server actions для `page_content` (длинные markdown-страницы).
 *
 * Гард — `requireAdmin(["owner","manager","content"])`. Все 3 роли
 * могут редактировать (policy / terms / оферта — контентные страницы).
 */

export interface PageContentActionResult {
  ok: boolean;
  error?: string;
}

export async function updatePageContentAction(
  rawPath: string,
  rawData: unknown,
): Promise<PageContentActionResult> {
  const profile = await requireResource("content.cms");

  if (typeof rawPath !== "string" || !isAllowedPageContentPath(rawPath)) {
    return { ok: false, error: `Неизвестная страница «${rawPath}»` };
  }

  // path из URL-сегмента важнее, чем из тела (защита от подмены).
  const payload =
    rawData && typeof rawData === "object"
      ? { ...(rawData as Record<string, unknown>), path: rawPath }
      : { path: rawPath };

  const parsed = pageContentSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await upsertPageContent(
      {
        path: parsed.data.path,
        title: parsed.data.title,
        content_markdown: parsed.data.content_markdown,
        published: parsed.data.published,
      },
      profile.id,
    );

    updateTag(pageContentCacheTag(parsed.data.path));
    revalidatePath(parsed.data.path);
    revalidatePath("/admin/content/pages");

    try {
      await sql`
        SELECT log_admin_action(
          ${profile.id},
          'page_content.upsert',
          'page_content',
          ${parsed.data.path},
          NULL,
          ${sql.json(
            {
              title: parsed.data.title,
              published: parsed.data.published,
              length: parsed.data.content_markdown.length,
            } as unknown as Parameters<typeof sql.json>[0],
          )},
          NULL,
          NULL
        )
      `;
    } catch (auditErr) {
      console.warn("[page-content.update] audit failed:", auditErr);
    }

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось сохранить страницу";
    console.error(`[page-content.update ${rawPath}]`, message);
    return { ok: false, error: message };
  }
}
