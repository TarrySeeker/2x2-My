import "server-only";

import { unstable_cache } from "next/cache";

import { sql } from "@/lib/db/client";
import type { Service } from "@/types";

/**
 * Каталог услуг (`services`) — карточки на главной (блок «Наши услуги»),
 * /services и при необходимости /services/[slug]. Введён миграцией
 * 018_services.sql.
 *
 * Публичные функции (`listEnabledServices`, `getServiceBySlug`) идут через
 * `unstable_cache` (тег `services`). Админские (`listAll`, `create`,
 * `update`, `delete`, `reorder`) пишут в БД напрямую — server action'ы
 * обязаны вызывать `revalidateTag(SERVICES_CACHE_TAG)`.
 *
 * Все DB-чтения обёрнуты в try/catch с деградацией до пустого массива —
 * витрина не должна падать в build/SSR при недоступной БД (placeholder
 * DATABASE_URL в Docker builder, см. lib/db/client.ts).
 */

export const SERVICES_CACHE_TAG = "services";

/**
 * features в БД хранится как jsonb. На уровне TS возвращаем `string[]`,
 * остальное (другие формы — объекты, числа) превращаем в null.
 */
function normalizeFeatures(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null;
  const arr = raw.filter((v) => typeof v === "string") as string[];
  return arr.length > 0 ? arr : null;
}

/**
 * Преобразуем сырую row из postgres в публичный Service-тип.
 * Числовые поля postgres-js может вернуть строкой (NUMERIC), приводим.
 */
interface RawServiceRow {
  id: string;
  slug: string;
  title: string;
  short_description: string | null;
  long_description: string | null;
  price_from: string | number | null;
  price_unit: string | null;
  price_label: string | null;
  icon: string | null;
  cover_image: string | null;
  category: string | null;
  href: string | null;
  enabled: boolean;
  display_order: number;
  features: unknown;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: RawServiceRow): Service {
  const priceFrom =
    row.price_from === null
      ? null
      : typeof row.price_from === "string"
        ? Number(row.price_from)
        : row.price_from;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    short_description: row.short_description,
    long_description: row.long_description,
    price_from: priceFrom,
    price_unit: row.price_unit,
    price_label: row.price_label,
    icon: row.icon,
    cover_image: row.cover_image,
    category: row.category,
    href: row.href,
    enabled: row.enabled,
    display_order: row.display_order,
    features: normalizeFeatures(row.features),
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const SELECT_COLS = `
  id, slug, title, short_description, long_description,
  price_from, price_unit, price_label, icon, cover_image,
  category, href, enabled, display_order, features,
  seo_title, seo_description, created_at, updated_at
`;

const listEnabledCached = unstable_cache(
  async (): Promise<Service[]> => {
    try {
      const rows = await sql<RawServiceRow[]>`
        SELECT id, slug, title, short_description, long_description,
               price_from, price_unit, price_label, icon, cover_image,
               category, href, enabled, display_order, features,
               seo_title, seo_description, created_at, updated_at
        FROM services
        WHERE enabled = TRUE
        ORDER BY display_order ASC, created_at ASC
      `;
      return rows.map(fromRow);
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[services.listEnabled] DB read failed:", err);
      }
      return [];
    }
  },
  ["services-enabled"],
  { revalidate: 60, tags: [SERVICES_CACHE_TAG] },
);

/**
 * Только enabled-услуги, отсортированные по display_order.
 * Используется витриной (главная, /services, /services/[slug]).
 */
export async function listEnabledServices(): Promise<Service[]> {
  return listEnabledCached();
}

/**
 * Все услуги (включая скрытые) — для админки. БЕЗ кэша.
 */
export async function listAllServices(): Promise<Service[]> {
  try {
    const rows = await sql<RawServiceRow[]>`
      SELECT id, slug, title, short_description, long_description,
             price_from, price_unit, price_label, icon, cover_image,
             category, href, enabled, display_order, features,
             seo_title, seo_description, created_at, updated_at
      FROM services
      ORDER BY display_order ASC, created_at ASC
    `;
    return rows.map(fromRow);
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[services.listAll] DB read failed:", err);
    }
    return [];
  }
}

const getBySlugCached = unstable_cache(
  async (slug: string): Promise<Service | null> => {
    try {
      const rows = await sql<RawServiceRow[]>`
        SELECT id, slug, title, short_description, long_description,
               price_from, price_unit, price_label, icon, cover_image,
               category, href, enabled, display_order, features,
               seo_title, seo_description, created_at, updated_at
        FROM services
        WHERE slug = ${slug} AND enabled = TRUE
        LIMIT 1
      `;
      return rows[0] ? fromRow(rows[0]) : null;
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[services.getBySlug] DB read failed:", err);
      }
      return null;
    }
  },
  ["services-by-slug"],
  { revalidate: 60, tags: [SERVICES_CACHE_TAG] },
);

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  return getBySlugCached(slug);
}

/** Любая услуга по id (включая скрытые) — для админки. */
export async function getServiceById(id: string): Promise<Service | null> {
  const rows = await sql<RawServiceRow[]>`
    SELECT id, slug, title, short_description, long_description,
           price_from, price_unit, price_label, icon, cover_image,
           category, href, enabled, display_order, features,
           seo_title, seo_description, created_at, updated_at
    FROM services
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? fromRow(rows[0]) : null;
}

// ============================================================
// Mutations (admin only — server action'ы должны звать requireAdmin)
// ============================================================

export interface ServiceInput {
  slug: string;
  title: string;
  shortDescription: string | null;
  longDescription: string | null;
  priceFrom: number | null;
  priceUnit: string | null;
  priceLabel: string | null;
  icon: string | null;
  coverImage: string | null;
  category: string | null;
  href: string | null;
  enabled: boolean;
  displayOrder: number;
  features: string[] | null;
  seoTitle: string | null;
  seoDescription: string | null;
}

export async function createService(input: ServiceInput): Promise<Service> {
  const featuresJson =
    input.features && input.features.length > 0
      ? sql.json(input.features as unknown as Parameters<typeof sql.json>[0])
      : null;

  const rows = await sql<RawServiceRow[]>`
    INSERT INTO services (
      slug, title, short_description, long_description,
      price_from, price_unit, price_label, icon, cover_image,
      category, href, enabled, display_order, features,
      seo_title, seo_description
    ) VALUES (
      ${input.slug},
      ${input.title},
      ${input.shortDescription},
      ${input.longDescription},
      ${input.priceFrom},
      ${input.priceUnit},
      ${input.priceLabel},
      ${input.icon},
      ${input.coverImage},
      ${input.category},
      ${input.href},
      ${input.enabled},
      ${input.displayOrder},
      ${featuresJson},
      ${input.seoTitle},
      ${input.seoDescription}
    )
    RETURNING ${sql.unsafe(SELECT_COLS)}
  `;
  const row = rows[0];
  if (!row) throw new Error("Failed to insert services");
  return fromRow(row);
}

export async function updateService(
  id: string,
  input: ServiceInput,
): Promise<Service> {
  const featuresJson =
    input.features && input.features.length > 0
      ? sql.json(input.features as unknown as Parameters<typeof sql.json>[0])
      : null;

  const rows = await sql<RawServiceRow[]>`
    UPDATE services
    SET slug              = ${input.slug},
        title             = ${input.title},
        short_description = ${input.shortDescription},
        long_description  = ${input.longDescription},
        price_from        = ${input.priceFrom},
        price_unit        = ${input.priceUnit},
        price_label       = ${input.priceLabel},
        icon              = ${input.icon},
        cover_image       = ${input.coverImage},
        category          = ${input.category},
        href              = ${input.href},
        enabled           = ${input.enabled},
        display_order     = ${input.displayOrder},
        features          = ${featuresJson},
        seo_title         = ${input.seoTitle},
        seo_description   = ${input.seoDescription},
        updated_at        = NOW()
    WHERE id = ${id}
    RETURNING ${sql.unsafe(SELECT_COLS)}
  `;
  const row = rows[0];
  if (!row) throw new Error("Service not found");
  return fromRow(row);
}

/**
 * Soft-delete: НЕ удаляет строку, а ставит enabled = false.
 * Возвращает `true` если что-то изменилось. Сама строка остаётся в БД,
 * чтобы позже клиент мог восстановить услугу галочкой «показывать».
 *
 * Если нужен полный hard-delete (удалить вместе с историей) — есть
 * `hardDeleteService` ниже.
 */
export async function softDeleteService(id: string): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`
    UPDATE services
    SET enabled = FALSE,
        updated_at = NOW()
    WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}

/**
 * Полное удаление строки. Возвращает старый cover_image (если был),
 * чтобы caller мог удалить файл из MinIO.
 */
export async function hardDeleteService(id: string): Promise<string | null> {
  const rows = await sql<{ cover_image: string | null }[]>`
    DELETE FROM services
    WHERE id = ${id}
    RETURNING cover_image
  `;
  return rows[0]?.cover_image ?? null;
}

/**
 * Массовое обновление display_order по упорядоченному списку id.
 * Транзакционно. Шаг = 10 (как в seed'е) — оставляет место для ручных вставок.
 */
export async function reorderServices(orderedIds: string[]): Promise<void> {
  if (orderedIds.length === 0) return;
  await sql.begin(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i]!;
      const order = (i + 1) * 10;
      await tx`
        UPDATE services
        SET display_order = ${order},
            updated_at = NOW()
        WHERE id = ${id}
      `;
    }
  });
}
