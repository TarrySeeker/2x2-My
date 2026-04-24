import "server-only";

import { unstable_cache } from "next/cache";

import { sql } from "@/lib/db/client";
import type { Json } from "@/types/database";

/**
 * Глобальные настройки сайта (site_settings).
 *
 * Тоже что и `cms.ts`, но для key/value: контакты, соцсети, часы,
 * статистика. Кеш 60 сек, тег `settings:<key>`.
 *
 * ВНИМАНИЕ: в проекте есть ещё одна таблица `settings` (старая, для
 * магазина — shop.name, shop.phone). НЕ путать. Этот модуль работает
 * только с `site_settings` (создана в миграции 006).
 */

export interface SiteSetting {
  key: string;
  value: Json;
  updatedAt: string;
}

interface SiteSettingRow {
  key: string;
  value: Json;
  updated_at: string;
}

function toSetting(row: SiteSettingRow): SiteSetting {
  // postgres-js может вернуть `updated_at` как Date или string в зависимости
  // от настройки types. Даункастим в unknown — TS не разрешает
  // `string instanceof Date` напрямую.
  const raw: unknown = row.updated_at;
  return {
    key: row.key,
    value: row.value,
    updatedAt:
      raw instanceof Date ? raw.toISOString() : String(raw),
  };
}

async function readSetting(key: string): Promise<SiteSetting | null> {
  try {
    const rows = await sql<SiteSettingRow[]>`
      SELECT key, value, updated_at
      FROM site_settings
      WHERE key = ${key}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? toSetting(row) : null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[settings.getSetting ${key}] DB read failed:`, err);
    }
    return null;
  }
}

type SettingCacheFn = (k: string) => Promise<SiteSetting | null>;
const settingCacheByKey = new Map<string, SettingCacheFn>();

function makeSettingCache(key: string): SettingCacheFn {
  const existing = settingCacheByKey.get(key);
  if (existing) return existing;
  const fn: SettingCacheFn = unstable_cache(
    async (k: string) => readSetting(k),
    ["site-setting", key],
    { revalidate: 60, tags: [`settings:${key}`] },
  );
  settingCacheByKey.set(key, fn);
  return fn;
}

export async function getSetting(key: string): Promise<SiteSetting | null> {
  return makeSettingCache(key)(key);
}

/**
 * Удобный helper: вернуть value секции (по умолчанию — fallback).
 * Полезен в server-component'ах, которым нужны только данные.
 */
export async function getSettingValue<T = Json>(
  key: string,
  fallback: T,
): Promise<T> {
  const setting = await getSetting(key);
  if (!setting) return fallback;
  return (setting.value as T) ?? fallback;
}

export async function listSettings(): Promise<SiteSetting[]> {
  try {
    const rows = await sql<SiteSettingRow[]>`
      SELECT key, value, updated_at
      FROM site_settings
      ORDER BY key ASC
    `;
    return rows.map(toSetting);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[settings.listSettings] DB read failed:", err);
    }
    return [];
  }
}

export async function upsertSetting(
  key: string,
  value: Record<string, unknown> | unknown[] | string | number | boolean,
  userId: string | null,
): Promise<SiteSetting> {
  const rows = await sql<SiteSettingRow[]>`
    INSERT INTO site_settings (key, value, updated_by, updated_at)
    VALUES (
      ${key},
      ${sql.json(value as unknown as Parameters<typeof sql.json>[0])},
      ${userId},
      NOW()
    )
    ON CONFLICT (key)
    DO UPDATE SET
      value      = EXCLUDED.value,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING key, value, updated_at
  `;
  const row = rows[0];
  if (!row) throw new Error(`Failed to upsert site_settings.${key}`);
  return toSetting(row);
}
