"use server";

import { revalidatePath, updateTag } from "next/cache";

import { requireAdmin } from "@/features/auth/api";
import {
  upsertPageSection,
  reorderPageSections,
  setPageSectionEnabled,
  pageSectionsCacheTag,
} from "@/lib/data/page-sections";
import {
  PAGE_SECTION_SCHEMAS,
  isAllowedPageSection,
  isValidPageSectionContentType,
  PAGE_SECTIONS_ALLOWED,
  type PageSectionContentType,
} from "@/features/admin/schemas/page-sections";
import { sql } from "@/lib/db/client";

/**
 * Server actions для `page_sections` (универсальные блоки страниц).
 *
 * Гард — `requireAdmin(["owner","manager","content"])`. Все 3 роли
 * могут редактировать контент секций.
 *
 * Порядок валидации:
 *   1) Путь и ключ — в белом списке PAGE_SECTIONS_ALLOWED (страховка
 *      от создания секций на несуществующих страницах).
 *   2) content_type совпадает с ожидаемым для данной (page_path, section_key).
 *   3) content валиден по Zod-схеме соответствующего content_type.
 */

export interface PageSectionActionResult {
  ok: boolean;
  error?: string;
}

function getExpectedContentType(
  pagePath: string,
  sectionKey: string,
): PageSectionContentType | null {
  const allowed = PAGE_SECTIONS_ALLOWED.find(
    (a) => a.page_path === pagePath && a.section_key === sectionKey,
  );
  return allowed?.content_type ?? null;
}

// ============================================================
// upsertPageSectionAction
// ============================================================

export async function upsertPageSectionAction(
  rawPath: string,
  rawSectionKey: string,
  rawData: unknown,
): Promise<PageSectionActionResult> {
  const profile = await requireAdmin(["owner", "manager", "content"]);

  if (typeof rawPath !== "string" || typeof rawSectionKey !== "string") {
    return { ok: false, error: "Некорректный путь или ключ секции" };
  }

  const expectedType = getExpectedContentType(rawPath, rawSectionKey);
  if (!expectedType) {
    return {
      ok: false,
      error: `Секция «${rawSectionKey}» не определена для страницы ${rawPath}`,
    };
  }

  // Поддерживаем 2 формата payload:
  //   A) { content: {...}, display_order?, enabled? }
  //   B) сразу плоский объект content (шорткат).
  // Если `content` пришёл как поле — используем его, иначе всё тело считаем content.
  let contentRaw: unknown = rawData;
  let displayOrder: number | undefined;
  let enabled: boolean | undefined;
  if (
    rawData &&
    typeof rawData === "object" &&
    "content" in (rawData as Record<string, unknown>)
  ) {
    const obj = rawData as Record<string, unknown>;
    contentRaw = obj.content;
    if (typeof obj.display_order === "number") displayOrder = obj.display_order;
    if (typeof obj.enabled === "boolean") enabled = obj.enabled;
  }

  // Страхуемся ещё раз через allow-list + Zod-схему.
  if (!isAllowedPageSection(rawPath, rawSectionKey, expectedType)) {
    return {
      ok: false,
      error: `Комбинация ${rawPath}/${rawSectionKey} не разрешена`,
    };
  }
  if (!isValidPageSectionContentType(expectedType)) {
    return { ok: false, error: `Неизвестный content_type «${expectedType}»` };
  }

  const schema = PAGE_SECTION_SCHEMAS[expectedType];
  const parsed = schema.safeParse(contentRaw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  try {
    await upsertPageSection(
      {
        page_path: rawPath,
        section_key: rawSectionKey,
        content_type: expectedType,
        content: parsed.data as Record<string, unknown>,
        display_order: displayOrder,
        enabled: enabled,
      },
      profile.id,
    );

    updateTag(pageSectionsCacheTag(rawPath));
    revalidatePath(rawPath);
    revalidatePath("/admin/content/sections");

    try {
      await sql`
        SELECT log_admin_action(
          ${profile.id},
          'page_sections.upsert',
          'page_sections',
          ${`${rawPath}:${rawSectionKey}`},
          NULL,
          ${sql.json(parsed.data as unknown as Parameters<typeof sql.json>[0])},
          NULL,
          NULL
        )
      `;
    } catch (auditErr) {
      console.warn("[page-sections.upsert] audit failed:", auditErr);
    }

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось сохранить секцию";
    console.error(
      `[page-sections.upsert ${rawPath}/${rawSectionKey}]`,
      message,
    );
    return { ok: false, error: message };
  }
}

// ============================================================
// reorderPageSectionsAction
// ============================================================

export async function reorderPageSectionsAction(
  rawPath: string,
  orders: Array<{ key: string; order: number }>,
): Promise<PageSectionActionResult> {
  const profile = await requireAdmin(["owner", "manager", "content"]);

  if (typeof rawPath !== "string") {
    return { ok: false, error: "Некорректный путь" };
  }
  if (!Array.isArray(orders) || orders.length === 0) {
    return { ok: false, error: "Нет изменений" };
  }

  // Проверяем каждый ключ на принадлежность странице.
  for (const o of orders) {
    if (typeof o.key !== "string" || typeof o.order !== "number") {
      return { ok: false, error: "Некорректный формат порядка" };
    }
    if (!getExpectedContentType(rawPath, o.key)) {
      return {
        ok: false,
        error: `Секция «${o.key}» не определена для страницы ${rawPath}`,
      };
    }
  }

  try {
    await reorderPageSections(
      rawPath,
      orders.map((o) => ({ section_key: o.key, display_order: o.order })),
      profile.id,
    );

    updateTag(pageSectionsCacheTag(rawPath));
    revalidatePath(rawPath);
    revalidatePath("/admin/content/sections");

    try {
      await sql`
        SELECT log_admin_action(
          ${profile.id},
          'page_sections.reorder',
          'page_sections',
          ${rawPath},
          NULL,
          ${sql.json(orders as unknown as Parameters<typeof sql.json>[0])},
          NULL,
          NULL
        )
      `;
    } catch (auditErr) {
      console.warn("[page-sections.reorder] audit failed:", auditErr);
    }

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось изменить порядок";
    console.error(`[page-sections.reorder ${rawPath}]`, message);
    return { ok: false, error: message };
  }
}

// ============================================================
// togglePageSectionAction
// ============================================================

export async function togglePageSectionAction(
  rawPath: string,
  rawSectionKey: string,
  enabled: boolean,
): Promise<PageSectionActionResult> {
  const profile = await requireAdmin(["owner", "manager", "content"]);

  if (typeof rawPath !== "string" || typeof rawSectionKey !== "string") {
    return { ok: false, error: "Некорректный путь или ключ секции" };
  }
  if (!getExpectedContentType(rawPath, rawSectionKey)) {
    return {
      ok: false,
      error: `Секция «${rawSectionKey}» не определена для страницы ${rawPath}`,
    };
  }

  try {
    await setPageSectionEnabled(
      rawPath,
      rawSectionKey,
      Boolean(enabled),
      profile.id,
    );

    updateTag(pageSectionsCacheTag(rawPath));
    revalidatePath(rawPath);
    revalidatePath("/admin/content/sections");

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось изменить статус";
    console.error(
      `[page-sections.toggle ${rawPath}/${rawSectionKey}]`,
      message,
    );
    return { ok: false, error: message };
  }
}
