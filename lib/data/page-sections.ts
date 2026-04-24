import "server-only";

import { unstable_cache } from "next/cache";

import { sql } from "@/lib/db/client";
import type { Json } from "@/types/database";

/**
 * Data-layer для таблицы `page_sections` (миграция 010).
 *
 * Модель: (page_path, section_key) — составной уникальный ключ.
 * Внутри одной страницы секции упорядочены `display_order ASC` и имеют
 * разные `content_type` (hero, text_block, values, faq, cta и т.д.).
 *
 * Читаем кешированно — тег `page-sections:<page_path>`. При записи или
 * изменении порядка — инвалидируем этот тег.
 *
 * Zod-валидация content происходит не здесь, а в `lib/cms/page-section-content.ts`
 * (safe reader) и в server actions (при записи).
 */

export interface PageSection {
  id: string;
  pagePath: string;
  sectionKey: string;
  contentType: string;
  content: Json;
  displayOrder: number;
  enabled: boolean;
  updatedAt: string;
}

interface PageSectionRow {
  id: string;
  page_path: string;
  section_key: string;
  content_type: string;
  content: Json;
  display_order: number;
  enabled: boolean;
  updated_at: string | Date;
}

function toPageSection(row: PageSectionRow): PageSection {
  const raw: unknown = row.updated_at;
  return {
    id: row.id,
    pagePath: row.page_path,
    sectionKey: row.section_key,
    contentType: row.content_type,
    content: row.content,
    displayOrder: row.display_order,
    enabled: row.enabled,
    updatedAt: raw instanceof Date ? raw.toISOString() : String(raw),
  };
}

export function pageSectionsCacheTag(pagePath: string): string {
  return `page-sections:${pagePath}`;
}

// ── read ──

async function readPageSections(
  pagePath: string,
  enabledOnly: boolean,
): Promise<PageSection[]> {
  try {
    const rows = enabledOnly
      ? await sql<PageSectionRow[]>`
          SELECT id, page_path, section_key, content_type, content,
                 display_order, enabled, updated_at
          FROM page_sections
          WHERE page_path = ${pagePath} AND enabled = true
          ORDER BY display_order ASC, section_key ASC
        `
      : await sql<PageSectionRow[]>`
          SELECT id, page_path, section_key, content_type, content,
                 display_order, enabled, updated_at
          FROM page_sections
          WHERE page_path = ${pagePath}
          ORDER BY display_order ASC, section_key ASC
        `;
    return rows.map(toPageSection);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[page-sections.getPageSections ${pagePath}] DB read failed:`,
        err,
      );
    }
    return [];
  }
}

// Кеш per-page, как в lib/data/cms.ts.
type SectionsCacheFn = (p: string) => Promise<PageSection[]>;
const sectionsCacheByPath = new Map<string, SectionsCacheFn>();

function makeSectionsCache(pagePath: string): SectionsCacheFn {
  const existing = sectionsCacheByPath.get(pagePath);
  if (existing) return existing;
  const fn: SectionsCacheFn = unstable_cache(
    async (p: string) => readPageSections(p, true),
    ["page-sections", pagePath],
    { revalidate: 60, tags: [pageSectionsCacheTag(pagePath)] },
  );
  sectionsCacheByPath.set(pagePath, fn);
  return fn;
}

/**
 * Возвращает все секции страницы, упорядоченные по display_order.
 * По умолчанию — только `enabled = true`.
 *
 * Если нужен полный список (админка) — передай { enabledOnly: false };
 * в этом режиме кеш не используется.
 */
export async function getPageSections(
  pagePath: string,
  options?: { enabledOnly?: boolean },
): Promise<PageSection[]> {
  const enabledOnly = options?.enabledOnly ?? true;
  if (enabledOnly) {
    return makeSectionsCache(pagePath)(pagePath);
  }
  return readPageSections(pagePath, false);
}

/**
 * Возвращает одну секцию страницы или null, если её нет или она disabled.
 * Используется в server wrappers per-section (типа AboutHero-wrapper).
 */
export async function getPageSection(
  pagePath: string,
  sectionKey: string,
): Promise<PageSection | null> {
  const all = await getPageSections(pagePath, { enabledOnly: true });
  return all.find((s) => s.sectionKey === sectionKey) ?? null;
}

// ── write ──

export async function upsertPageSection(
  data: {
    page_path: string;
    section_key: string;
    content_type: string;
    content: Record<string, unknown>;
    display_order?: number;
    enabled?: boolean;
  },
  userId: string | null,
): Promise<PageSection> {
  const displayOrder = data.display_order ?? 0;
  const enabled = data.enabled ?? true;
  const rows = await sql<PageSectionRow[]>`
    INSERT INTO page_sections (
      page_path, section_key, content_type, content,
      display_order, enabled, updated_by, updated_at
    )
    VALUES (
      ${data.page_path},
      ${data.section_key},
      ${data.content_type},
      ${sql.json(data.content as unknown as Parameters<typeof sql.json>[0])},
      ${displayOrder},
      ${enabled},
      ${userId},
      NOW()
    )
    ON CONFLICT (page_path, section_key) DO UPDATE SET
      content_type  = EXCLUDED.content_type,
      content       = EXCLUDED.content,
      display_order = EXCLUDED.display_order,
      enabled       = EXCLUDED.enabled,
      updated_by    = EXCLUDED.updated_by,
      updated_at    = NOW()
    RETURNING id, page_path, section_key, content_type, content,
              display_order, enabled, updated_at
  `;
  const row = rows[0];
  if (!row) {
    throw new Error(
      `Failed to upsert page_sections.${data.page_path}.${data.section_key}`,
    );
  }
  return toPageSection(row);
}

/**
 * Пакетно обновляет display_order у секций одной страницы.
 * Все секции должны принадлежать указанной странице — проверяем DWH.
 * Транзакция: либо все, либо ничего.
 */
export async function reorderPageSections(
  pagePath: string,
  orders: Array<{ section_key: string; display_order: number }>,
  userId: string | null,
): Promise<void> {
  if (orders.length === 0) return;
  await sql.begin(async (tx) => {
    for (const o of orders) {
      await tx`
        UPDATE page_sections
        SET display_order = ${o.display_order},
            updated_by    = ${userId},
            updated_at    = NOW()
        WHERE page_path = ${pagePath} AND section_key = ${o.section_key}
      `;
    }
  });
}

/**
 * Включает / выключает секцию (без правки content).
 */
export async function setPageSectionEnabled(
  pagePath: string,
  sectionKey: string,
  enabled: boolean,
  userId: string | null,
): Promise<void> {
  await sql`
    UPDATE page_sections
    SET enabled     = ${enabled},
        updated_by  = ${userId},
        updated_at  = NOW()
    WHERE page_path = ${pagePath} AND section_key = ${sectionKey}
  `;
}
