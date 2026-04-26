import "server-only";

import { sql } from "@/lib/db/client";

/**
 * Общий helper для записи в audit_log.
 *
 * Раньше каждый файл `features/admin/actions/*.ts` имел свою копию
 * `audit()` / `logAudit()` функции. Чтобы упростить добавление лога
 * в новые server actions и не плодить дубли — теперь есть единый
 * `logAdminAction()`, который под капотом вызывает RPC `log_admin_action`
 * (см. `db/migrations/003_triggers_and_functions.sql`).
 *
 * Вызов **never throws** — мы не хотим, чтобы упавший audit ронял
 * основное действие. Ошибки только логируются в dev-режиме.
 *
 * Конвенции:
 *   action     — `'<ресурс>.<глагол>'`, напр. `'services.create'`,
 *                `'banners.delete'`, `'reviews.bulk_approve'`.
 *   tableName  — имя таблицы в БД (или null, если действие не привязано
 *                к одной таблице, напр. `'menu.reorder'`).
 *   recordId   — id затронутой строки (number|string|null) — приводим к TEXT.
 *   payload    — произвольный JSON: входные параметры action-а,
 *                чтобы потом можно было разобраться, что произошло.
 *
 * NB: payload не должен содержать секретов (токенов, паролей, PII)!
 *      Сейчас audit_log не RLS-фильтруется и доступен всем admin-ам.
 */

export async function logAdminAction(
  userId: string,
  action: string,
  tableName: string | null,
  recordId: string | number | null,
  payload: unknown,
): Promise<void> {
  const recordIdText =
    recordId === null || recordId === undefined ? null : String(recordId);

  try {
    await sql`
      SELECT log_admin_action(
        ${userId},
        ${action},
        ${tableName},
        ${recordIdText},
        NULL,
        ${sql.json(payload as unknown as Parameters<typeof sql.json>[0])},
        NULL,
        NULL
      )
    `;
  } catch (err) {
    // Не валим основное действие из-за audit-проблемы.
    // В local-средах функции `log_admin_action` может не быть.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[audit]", action, err);
    }
  }
}
