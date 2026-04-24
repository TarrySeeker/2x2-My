import "server-only";

import { unstable_cache } from "next/cache";

import { sql } from "@/lib/db/client";
import { getSettingValue } from "@/lib/data/settings";

/**
 * Data-layer для таблицы `page_content` (миграция 013).
 *
 * Длинные текстовые страницы в markdown: /privacy, /terms, /offer.
 * Тело может содержать плейсхолдеры вида `{legal_name}`, `{phone}` —
 * при чтении через `getPageContent` они подставляются из
 * `site_settings.legal_entity`, `contacts`, `pd_consent`.
 *
 * Кеш: тег `page-content:<path>`. При upsert — инвалидация тега.
 */

export interface PageContentRaw {
  id: string;
  path: string;
  title: string;
  contentMarkdown: string;
  version: number;
  published: boolean;
  updatedAt: string;
}

/**
 * Возвращается `getPageContent` — markdown УЖЕ с подставленными
 * плейсхолдерами. В БД хранится сырой markdown с `{legal_name}` и т.п.
 */
export interface PageContentRendered extends PageContentRaw {
  /** Markdown с подставленными плейсхолдерами. */
  contentMarkdown: string;
}

interface PageContentRow {
  id: string;
  path: string;
  title: string;
  content_markdown: string;
  version: number;
  published: boolean;
  updated_at: string | Date;
}

function toPageContent(row: PageContentRow): PageContentRaw {
  const raw: unknown = row.updated_at;
  return {
    id: row.id,
    path: row.path,
    title: row.title,
    contentMarkdown: row.content_markdown,
    version: row.version,
    published: row.published,
    updatedAt: raw instanceof Date ? raw.toISOString() : String(raw),
  };
}

export function pageContentCacheTag(path: string): string {
  return `page-content:${path}`;
}

// ── placeholders ──

interface LegalEntity {
  legal_name?: string;
  inn?: string;
  ogrn?: string;
  kpp?: string;
  legal_address?: string;
  actual_address?: string;
}
interface Contacts {
  phone_primary?: string;
  phone_secondary?: string;
  email?: string;
  address?: string;
}
interface PdConsent {
  current_version?: string;
  policy_url?: string;
}

/**
 * Русское представление даты в формате "23 апреля 2026 г.".
 * policyVersion может быть как "2026-04-23", так и "v2". Если это не
 * ISO-дата — возвращаем fallback = policyVersion.
 */
function formatPolicyDate(policyVersion: string): string {
  if (!policyVersion) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(policyVersion);
  if (!m) return policyVersion;
  const [, y, mo, d] = m;
  const monthNames = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
  ];
  const month = monthNames[parseInt(mo, 10) - 1] ?? mo;
  return `${parseInt(d, 10)} ${month} ${y} г.`;
}

/**
 * Собирает полную карту плейсхолдеров из site_settings.
 * Неизвестные/пустые значения дают пустую строку (плейсхолдер удаляется).
 */
export async function buildPlaceholderMap(): Promise<Record<string, string>> {
  const [legal, contacts, pdConsent] = await Promise.all([
    getSettingValue<LegalEntity>("legal_entity", {}),
    getSettingValue<Contacts>("contacts", {}),
    getSettingValue<PdConsent>("pd_consent", {}),
  ]);

  const policyVersion = pdConsent.current_version ?? "";

  return {
    legal_name:     legal.legal_name     ?? "",
    inn:            legal.inn            ?? "",
    ogrn:           legal.ogrn           ?? "",
    kpp:            legal.kpp            ?? "",
    legal_address:  legal.legal_address  ?? "",
    actual_address: legal.actual_address ?? "",
    phone:          contacts.phone_primary ?? "",
    email:          contacts.email       ?? "",
    policy_version: policyVersion,
    policy_date:    formatPolicyDate(policyVersion),
  };
}

/**
 * Подставляет плейсхолдеры {key} в строку по карте. Неизвестные ключи
 * оставляются как есть — чтобы ошибочная верстка {some} не превращалась
 * в пустое место и была заметна при ревью.
 *
 * Экспортируется для unit-тестов.
 */
export function renderPlaceholders(
  markdown: string,
  map: Record<string, string>,
): string {
  return markdown.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (full, rawKey: string) => {
    const key = rawKey.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      return map[key];
    }
    return full;
  });
}

// ── read ──

async function readPageContentRaw(path: string): Promise<PageContentRaw | null> {
  try {
    const rows = await sql<PageContentRow[]>`
      SELECT id, path, title, content_markdown, version, published, updated_at
      FROM page_content
      WHERE path = ${path}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? toPageContent(row) : null;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[page-content.getPageContent ${path}] DB read failed:`, err);
    }
    return null;
  }
}

type PageContentCacheFn = (p: string) => Promise<PageContentRaw | null>;
const pageContentCacheByPath = new Map<string, PageContentCacheFn>();

function makePageContentCache(path: string): PageContentCacheFn {
  const existing = pageContentCacheByPath.get(path);
  if (existing) return existing;
  const fn: PageContentCacheFn = unstable_cache(
    async (p: string) => readPageContentRaw(p),
    ["page-content", path],
    { revalidate: 60, tags: [pageContentCacheTag(path)] },
  );
  pageContentCacheByPath.set(path, fn);
  return fn;
}

/**
 * Возвращает контент страницы с подставленными плейсхолдерами.
 * Если страница не опубликована — возвращает null.
 */
export async function getPageContent(
  path: string,
): Promise<PageContentRendered | null> {
  const raw = await makePageContentCache(path)(path);
  if (!raw) return null;
  if (!raw.published) return null;
  const map = await buildPlaceholderMap();
  return {
    ...raw,
    contentMarkdown: renderPlaceholders(raw.contentMarkdown, map),
  };
}

/**
 * Сырой markdown без подстановок — для админки-редактора.
 * Показывает клиенту плейсхолдеры, чтобы он мог их сохранить.
 */
export async function getPageContentRaw(
  path: string,
): Promise<PageContentRaw | null> {
  return makePageContentCache(path)(path);
}

/**
 * Все записи (для admin-листинга).
 */
export async function listPageContent(): Promise<PageContentRaw[]> {
  try {
    const rows = await sql<PageContentRow[]>`
      SELECT id, path, title, content_markdown, version, published, updated_at
      FROM page_content
      ORDER BY path ASC
    `;
    return rows.map(toPageContent);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[page-content.listPageContent] DB read failed:", err);
    }
    return [];
  }
}

// ── write ──

/**
 * Upsert контента. Инкрементирует version при каждом UPDATE.
 */
export async function upsertPageContent(
  data: {
    path: string;
    title: string;
    content_markdown: string;
    published: boolean;
  },
  userId: string | null,
): Promise<PageContentRaw> {
  const rows = await sql<PageContentRow[]>`
    INSERT INTO page_content (
      path, title, content_markdown, version, published,
      updated_by, updated_at
    )
    VALUES (
      ${data.path},
      ${data.title},
      ${data.content_markdown},
      1,
      ${data.published},
      ${userId},
      NOW()
    )
    ON CONFLICT (path) DO UPDATE SET
      title            = EXCLUDED.title,
      content_markdown = EXCLUDED.content_markdown,
      version          = page_content.version + 1,
      published        = EXCLUDED.published,
      updated_by       = EXCLUDED.updated_by,
      updated_at       = NOW()
    RETURNING id, path, title, content_markdown, version, published, updated_at
  `;
  const row = rows[0];
  if (!row) throw new Error(`Failed to upsert page_content.${data.path}`);
  return toPageContent(row);
}
