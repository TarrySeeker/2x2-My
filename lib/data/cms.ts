import "server-only";

import { unstable_cache } from "next/cache";

import { sql } from "@/lib/db/client";
import type { Json } from "@/types/database";

/**
 * Чтение / запись JSONB-секций главной (homepage_sections).
 *
 * - Чтения кешируются `unstable_cache` на 60 сек, тег = `cms:<key>`.
 * - Запись через `upsertSection` инвалидирует тег.
 * - Никаких Zod-валидаций на этом уровне — структура `content` зависит
 *   от ключа и проверяется в server actions при сохранении.
 */

export interface HomepageSection {
  key: string;
  content: Json;
  isPublished: boolean;
  updatedAt: string;
}

interface HomepageSectionRow {
  key: string;
  content: Json;
  is_published: boolean;
  updated_at: string;
}

function toSection(row: HomepageSectionRow): HomepageSection {
  // postgres-js может вернуть `updated_at` как Date или string в зависимости
  // от настройки types. Нормализуем без узкого instanceof — TS не разрешает
  // `string instanceof Date`, поэтому даункастим в unknown.
  const raw: unknown = row.updated_at;
  return {
    key: row.key,
    content: row.content,
    isPublished: row.is_published,
    updatedAt:
      raw instanceof Date ? raw.toISOString() : String(raw),
  };
}

async function readSection(key: string): Promise<HomepageSection | null> {
  try {
    const rows = await sql<HomepageSectionRow[]>`
      SELECT key, content, is_published, updated_at
      FROM homepage_sections
      WHERE key = ${key}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? toSection(row) : null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[cms.getSection ${key}] DB read failed:`, err);
    }
    return null;
  }
}

/**
 * Возвращает секцию по ключу. Кеш 60 сек, тег `cms:<key>`.
 *
 * Невидимый для агентов нюанс: `unstable_cache` мемоизирует по
 * сериализованным аргументам, а не по `key`. Делаем фабрику —
 * кеш-функция создаётся под каждый ключ отдельно.
 */
type SectionCacheFn = (k: string) => Promise<HomepageSection | null>;
const sectionCacheByKey = new Map<string, SectionCacheFn>();

function makeSectionCache(key: string): SectionCacheFn {
  const existing = sectionCacheByKey.get(key);
  if (existing) return existing;
  const fn: SectionCacheFn = unstable_cache(
    async (k: string) => readSection(k),
    ["cms-section", key],
    { revalidate: 60, tags: [`cms:${key}`] },
  );
  sectionCacheByKey.set(key, fn);
  return fn;
}

export async function getSection(
  key: string,
): Promise<HomepageSection | null> {
  return makeSectionCache(key)(key);
}

export async function listSections(): Promise<HomepageSection[]> {
  try {
    const rows = await sql<HomepageSectionRow[]>`
      SELECT key, content, is_published, updated_at
      FROM homepage_sections
      ORDER BY key ASC
    `;
    return rows.map(toSection);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[cms.listSections] DB read failed:", err);
    }
    return [];
  }
}

/**
 * Upsert секции. Возвращает обновлённую запись.
 * Принимает любой JSON-объект. Структура валидируется на уровне
 * server action (см. features/admin/actions/cms.ts).
 *
 * userId — для аудита (`updated_by`). Может быть null, если запись
 * выполняется системным сидером (миграция/тесты).
 */
export async function upsertSection(
  key: string,
  content: Record<string, unknown>,
  userId: string | null,
): Promise<HomepageSection> {
  const rows = await sql<HomepageSectionRow[]>`
    INSERT INTO homepage_sections (key, content, updated_by, updated_at)
    VALUES (
      ${key},
      ${sql.json(content as unknown as Parameters<typeof sql.json>[0])},
      ${userId},
      NOW()
    )
    ON CONFLICT (key)
    DO UPDATE SET
      content    = EXCLUDED.content,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING key, content, is_published, updated_at
  `;
  const row = rows[0];
  if (!row) throw new Error(`Failed to upsert homepage_sections.${key}`);
  return toSection(row);
}

/**
 * Включает / выключает публикацию секции (без правки content).
 * Используется в админке как быстрый toggle.
 */
export async function setSectionPublished(
  key: string,
  isPublished: boolean,
  userId: string | null,
): Promise<void> {
  await sql`
    UPDATE homepage_sections
    SET is_published = ${isPublished},
        updated_by   = ${userId},
        updated_at   = NOW()
    WHERE key = ${key}
  `;
}
