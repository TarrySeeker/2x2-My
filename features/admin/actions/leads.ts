"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";

import { requireResource } from "@/features/auth/api";
import { sql } from "@/lib/db/client";
import {
  LEAD_TYPES,
  deleteLead,
  isLeadType,
  type LeadType,
} from "@/features/admin/api/leads";

/**
 * Server-actions для админ-раздела заявок.
 *
 * Permissions matrix
 * ──────────────────
 *   Просмотр (LeadsTable, LeadDetail):  owner | manager | content
 *   Удаление (deleteLeadAction):        owner | manager  (content НЕ может)
 *
 * Контент-менеджер не должен удалять PII-данные клиентов — это вне его зоны.
 * Список ролей передаём в `requireAdmin([...])` явно.
 *
 * Audit
 * ─────
 *   Любое удаление пишется в `audit_log` через RPC `log_admin_action`.
 *   action = `lead.delete`, table_name = реальная таблица БД,
 *   record_id = строковый id. Падение audit-INSERT НЕ блокирует удаление
 *   (мы не хотим, чтобы баг в логировании оставлял PII в БД).
 */

const deleteSchema = z.object({
  type: z.enum(LEAD_TYPES),
  id: z.coerce.number().int().positive(),
});

export interface DeleteLeadResult {
  ok: boolean;
  error?: string;
}

export async function deleteLeadAction(
  rawType: unknown,
  rawId: unknown,
): Promise<DeleteLeadResult> {
  // Доступ: owner + manager (по permissions matrix). content явно исключён.
  const profile = await requireResource("leads");

  const parsed = deleteSchema.safeParse({ type: rawType, id: rawId });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные параметры",
    };
  }

  const { type, id } = parsed.data;

  // Defence-in-depth: даже если zod пропустил, проверяем whitelist руками.
  if (!isLeadType(type)) {
    return { ok: false, error: `Неизвестный тип заявки: ${type as string}` };
  }

  try {
    const deleted = await deleteLead(type as LeadType, id);
    if (deleted === 0) {
      return { ok: false, error: "Заявка не найдена или уже удалена" };
    }

    // Audit: пишем имя реальной таблицы (calculation_requests / leads /
    // contact_requests) — так в логах удобнее искать. action всегда
    // одинаковый для всех типов, чтобы можно было легко отфильтровать
    // удаления заявок одним запросом.
    try {
      const tableName =
        type === "quote"
          ? "calculation_requests"
          : type === "one-click"
            ? "leads"
            : "contact_requests";
      await sql`
        SELECT log_admin_action(
          ${profile.id},
          'lead.delete',
          ${tableName},
          ${String(id)},
          NULL,
          NULL,
          NULL,
          NULL
        )
      `;
    } catch (auditErr) {
      // Не блокируем основной поток — деструктивная операция уже выполнена.
      console.warn("[leads.deleteLeadAction] audit failed:", auditErr);
    }

    revalidatePath("/admin/leads");
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось удалить заявку";
    console.error("[leads.deleteLeadAction]", message);
    return { ok: false, error: message };
  }
}
