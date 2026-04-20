import "server-only";

import { sql } from "@/lib/db/client";
import type { Row } from "@/lib/db/table-types";
import type { PromoFilters } from "@/features/admin/schemas/promo";

type PromoRow = Row<"promo_codes">;

// ── List with filters ──

export async function getPromoCodes(
  filters: PromoFilters,
): Promise<{ data: PromoRow[]; total: number }> {
  try {
    const { status, page, per_page } = filters;
    const offset = (page - 1) * per_page;
    const now = new Date().toISOString();

    // Построим условие статуса
    let statusClause: "active" | "inactive" | "expired" | null = null;
    if (status === "active" || status === "inactive" || status === "expired") {
      statusClause = status;
    }

    const totalRows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM promo_codes
      WHERE
        CASE ${statusClause ?? ""}
          WHEN 'active' THEN is_active = true AND (valid_to IS NULL OR valid_to > ${now}::timestamptz)
          WHEN 'inactive' THEN is_active = false
          WHEN 'expired' THEN valid_to < ${now}::timestamptz
          ELSE true
        END
    `;
    const total = totalRows[0]?.count ?? 0;

    const rows = await sql<PromoRow[]>`
      SELECT *
      FROM promo_codes
      WHERE
        CASE ${statusClause ?? ""}
          WHEN 'active' THEN is_active = true AND (valid_to IS NULL OR valid_to > ${now}::timestamptz)
          WHEN 'inactive' THEN is_active = false
          WHEN 'expired' THEN valid_to < ${now}::timestamptz
          ELSE true
        END
      ORDER BY created_at DESC
      LIMIT ${per_page}
      OFFSET ${offset}
    `;

    return { data: rows, total };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getPromoCodes] DB request failed:", err);
    }
    return { data: [], total: 0 };
  }
}

// ── Create ──

export async function createPromoCode(input: {
  code: string;
  description?: string | null;
  type: "fixed" | "percent";
  value: number;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  max_uses?: number | null;
  is_active: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
}): Promise<PromoRow> {
  const rows = await sql<PromoRow[]>`
    INSERT INTO promo_codes (
      code, description, type, value,
      min_order_amount, max_discount_amount, max_uses, max_uses_per_user,
      applies_to_category_ids, applies_to_product_ids,
      is_active, valid_from, valid_to
    )
    VALUES (
      ${input.code},
      ${input.description ?? null},
      ${input.type},
      ${input.value},
      ${input.min_order_amount ?? null},
      ${input.max_discount_amount ?? null},
      ${input.max_uses ?? null},
      NULL,
      ${sql.array([] as number[], 1016)},
      ${sql.array([] as number[], 1016)},
      ${input.is_active},
      ${input.valid_from ?? null},
      ${input.valid_to ?? null}
    )
    RETURNING *
  `;
  const inserted = rows[0];
  if (!inserted) throw new Error("Не удалось создать промокод");
  return inserted;
}

// ── Update ──

export async function updatePromoCode(
  id: number,
  input: {
    code?: string;
    description?: string | null;
    type?: "fixed" | "percent";
    value?: number;
    min_order_amount?: number | null;
    max_discount_amount?: number | null;
    max_uses?: number | null;
    is_active?: boolean;
    valid_from?: string | null;
    valid_to?: string | null;
  },
): Promise<PromoRow> {
  // Загружаем текущие значения, перезаписываем заданными
  const existingRows = await sql<PromoRow[]>`
    SELECT * FROM promo_codes WHERE id = ${id} LIMIT 1
  `;
  const existing = existingRows[0];
  if (!existing) throw new Error("Промокод не найден");

  const merged = {
    code: input.code ?? existing.code,
    description: input.description ?? existing.description,
    type: input.type ?? existing.type,
    value: input.value ?? existing.value,
    min_order_amount: input.min_order_amount ?? existing.min_order_amount,
    max_discount_amount:
      input.max_discount_amount ?? existing.max_discount_amount,
    max_uses: input.max_uses ?? existing.max_uses,
    is_active: input.is_active ?? existing.is_active,
    valid_from: input.valid_from ?? existing.valid_from,
    valid_to: input.valid_to ?? existing.valid_to,
  };

  const rows = await sql<PromoRow[]>`
    UPDATE promo_codes
    SET
      code = ${merged.code},
      description = ${merged.description},
      type = ${merged.type},
      value = ${merged.value},
      min_order_amount = ${merged.min_order_amount},
      max_discount_amount = ${merged.max_discount_amount},
      max_uses = ${merged.max_uses},
      is_active = ${merged.is_active},
      valid_from = ${merged.valid_from},
      valid_to = ${merged.valid_to},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  const updated = rows[0];
  if (!updated) throw new Error("Промокод не найден");
  return updated;
}

// ── Delete ──

export async function deletePromoCode(id: number): Promise<void> {
  await sql`DELETE FROM promo_codes WHERE id = ${id}`;
}

// ── Check uniqueness ──

export async function checkCodeUniqueness(code: string): Promise<boolean> {
  const rows = await sql<{ count: number }[]>`
    SELECT COUNT(*)::int AS count
    FROM promo_codes
    WHERE code = ${code.toUpperCase()}
  `;
  return (rows[0]?.count ?? 0) === 0;
}
