import "server-only";

import { sql } from "@/lib/db/client";
import type { UserRole } from "@/types/database";

/**
 * Read-only API для списка админов команды.
 * Используется на /admin/settings (вкладка «Команда»).
 *
 * Не отдаёт password_hash, must_change_password, failed_login_attempts,
 * locked_until — это серверные технические поля, в UI не нужны.
 */

export interface AdminUserRow {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  // ORDER BY: сначала active, потом по дате создания (новые сверху).
  return await sql<AdminUserRow[]>`
    SELECT
      id,
      username,
      email,
      full_name,
      role,
      avatar_url,
      is_active,
      created_at,
      NULL::TIMESTAMPTZ AS last_login_at
    FROM users
    ORDER BY is_active DESC, created_at DESC
  `;
}

export async function getAdminUserById(
  id: string,
): Promise<AdminUserRow | null> {
  const rows = await sql<AdminUserRow[]>`
    SELECT
      id,
      username,
      email,
      full_name,
      role,
      avatar_url,
      is_active,
      created_at,
      NULL::TIMESTAMPTZ AS last_login_at
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}
