import "server-only";

import { unstable_cache } from "next/cache";

import { sql } from "@/lib/db/client";
import type { UiStringNamespace } from "@/features/admin/schemas/ui-strings";

/**
 * Data-layer для таблицы `ui_strings` (миграция 011).
 *
 * Плоский key/value справочник микротекстов UI. Читается очень часто
 * (почти каждая страница), поэтому весь словарь кешируется одним
 * снимком — тег `ui-strings` (глобальный). Любое обновление строки
 * инвалидирует тег целиком.
 *
 * Это сэкономит сотни запросов на страницу. Размер словаря ~100–500
 * строк, это десятки килобайт JSON — кеш ок.
 */

export const UI_STRINGS_CACHE_TAG = "ui-strings";

export interface UiString {
  id: string;
  key: string;
  value: string;
  namespace: string;
  description: string | null;
  updatedAt: string;
}

interface UiStringRow {
  id: string;
  key: string;
  value: string;
  namespace: string;
  description: string | null;
  updated_at: string | Date;
}

function toUiString(row: UiStringRow): UiString {
  const raw: unknown = row.updated_at;
  return {
    id: row.id,
    key: row.key,
    value: row.value,
    namespace: row.namespace,
    description: row.description,
    updatedAt: raw instanceof Date ? raw.toISOString() : String(raw),
  };
}

// ── internal read ──

async function readAllUiStringsMap(): Promise<Record<string, string>> {
  try {
    const rows = await sql<Array<{ key: string; value: string }>>`
      SELECT key, value FROM ui_strings
    `;
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ui-strings.readAllUiStringsMap] DB read failed:", err);
    }
    return {};
  }
}

/**
 * Кешированный читатель всего словаря. Один тег на весь словарь —
 * updateTag('ui-strings') после любого bulk-update.
 */
const cachedReadAllUiStringsMap = unstable_cache(
  async () => readAllUiStringsMap(),
  ["ui-strings-all"],
  { revalidate: 300, tags: [UI_STRINGS_CACHE_TAG] },
);

// ── public API ──

/**
 * Возвращает все ui_strings в виде плоского Record<key, value>.
 * Кешируется целиком на 5 минут с тегом 'ui-strings'.
 */
export async function getAllUiStrings(): Promise<Record<string, string>> {
  return cachedReadAllUiStringsMap();
}

/**
 * Одна строка по ключу. fallback возвращается, если ключа нет или БД
 * недоступна.
 */
export async function getUiString(
  key: string,
  fallback: string = "",
): Promise<string> {
  const all = await cachedReadAllUiStringsMap();
  return all[key] ?? fallback;
}

/**
 * Batch: несколько ключей одним вызовом. Возвращает Record<key, value>,
 * где value = fallback (пустая строка) для отсутствующих ключей.
 */
export async function getUiStrings(
  keys: string[],
): Promise<Record<string, string>> {
  const all = await cachedReadAllUiStringsMap();
  const out: Record<string, string> = {};
  for (const k of keys) out[k] = all[k] ?? "";
  return out;
}

/**
 * Все строки одного namespace'а — аккуратно, без кеша (админка).
 */
export async function getUiStringsByNamespace(
  namespace: UiStringNamespace | string,
): Promise<Record<string, string>> {
  try {
    const rows = await sql<Array<{ key: string; value: string }>>`
      SELECT key, value
      FROM ui_strings
      WHERE namespace = ${namespace}
      ORDER BY key ASC
    `;
    const out: Record<string, string> = {};
    for (const r of rows) out[r.key] = r.value;
    return out;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[ui-strings.getUiStringsByNamespace ${namespace}] DB read failed:`,
        err,
      );
    }
    return {};
  }
}

/**
 * Список полноценных записей — для админки (редактор с меткой updated_at).
 */
export async function listUiStringsByNamespace(
  namespace: UiStringNamespace | string,
): Promise<UiString[]> {
  try {
    const rows = await sql<UiStringRow[]>`
      SELECT id, key, value, namespace, description, updated_at
      FROM ui_strings
      WHERE namespace = ${namespace}
      ORDER BY key ASC
    `;
    return rows.map(toUiString);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[ui-strings.listUiStringsByNamespace ${namespace}] failed:`,
        err,
      );
    }
    return [];
  }
}

export async function listAllUiStrings(): Promise<UiString[]> {
  try {
    const rows = await sql<UiStringRow[]>`
      SELECT id, key, value, namespace, description, updated_at
      FROM ui_strings
      ORDER BY namespace ASC, key ASC
    `;
    return rows.map(toUiString);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[ui-strings.listAllUiStrings] DB read failed:", err);
    }
    return [];
  }
}

// ── write ──

/**
 * Обновляет value существующей строки по key.
 * Если ключа нет — бросает ошибку (создавать через seed, не через админку).
 *
 * Возвращает `true`, если строка обновлена; `false`, если ключа нет.
 */
export async function updateUiString(
  key: string,
  value: string,
  userId: string | null,
): Promise<boolean> {
  const rows = await sql<Array<{ key: string }>>`
    UPDATE ui_strings
    SET value       = ${value},
        updated_by  = ${userId},
        updated_at  = NOW()
    WHERE key = ${key}
    RETURNING key
  `;
  return rows.length > 0;
}

/**
 * Массовое обновление value по списку {key, value}. Транзакция:
 * либо обновляются ВСЕ существующие ключи, либо ничего.
 *
 * Если какой-то ключ не найден — транзакция откатывается и бросается
 * ошибка (см. bulkUpdateUiStringsAction для обработки в UI).
 *
 * Возвращает кол-во обновлённых строк.
 */
export async function updateUiStringsBulk(
  updates: Array<{ key: string; value: string }>,
  userId: string | null,
): Promise<number> {
  if (updates.length === 0) return 0;
  let count = 0;
  await sql.begin(async (tx) => {
    for (const u of updates) {
      const rows = await tx<Array<{ key: string }>>`
        UPDATE ui_strings
        SET value      = ${u.value},
            updated_by = ${userId},
            updated_at = NOW()
        WHERE key = ${u.key}
        RETURNING key
      `;
      if (rows.length === 0) {
        throw new Error(`ui_strings: ключ «${u.key}» не найден`);
      }
      count += 1;
    }
  });
  return count;
}
