import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { sql } from "@/lib/db/client";
import type { UserRole } from "@/types/database";

/**
 * Lucia Auth v3 — собственная реализация поверх postgres-js.
 *
 * Почему свой код, а не `@lucia-auth/adapter-postgresql`:
 *  1. Адаптер работает с node-postgres (pg), а у проекта уже есть
 *     единый клиент postgres-js. Второй пул соединений не нужен.
 *  2. Lucia v3 официально позиционируется как набор утилит —
 *     адаптер даёт только 6 функций (createSession/validate/delete …),
 *     которые мы повторяем здесь напрямую. Пакет `lucia` оставлен
 *     только ради типов и константного API на случай возврата.
 *
 * Схема БД: db/migrations/004_lucia_auth.sql
 *   users     (id TEXT, username, password_hash, role …)
 *   sessions  (id TEXT PRIMARY KEY, user_id TEXT FK, expires_at TIMESTAMPTZ)
 *
 * Токен vs id сессии:
 *  - клиенту в cookie уходит **token** — 32 случайных байта в base64url.
 *  - в БД сохраняется **sha256(token)** (колонка sessions.id).
 *    Если злоумышленник получит дамп БД — он не сможет выдать себя
 *    за пользователя без самого токена (только reversing sha256).
 *
 * Продление сессии:
 *  - срок жизни — 30 дней, sliding expiration.
 *  - если при validate пришёл токен, у которого осталось < 15 дней,
 *    expires_at обновляется до now + 30 дней. Это требование Lucia spec.
 */

const DAY_MS = 1000 * 60 * 60 * 24;
export const SESSION_EXPIRES_IN_MS = DAY_MS * 30;
const SESSION_RENEW_THRESHOLD_MS = DAY_MS * 15;

// ============================================================
// Session DTOs (возвращаются в бизнес-код)
// ============================================================
export interface SessionRecord {
  id: string;           // sha256(token)
  userId: string;
  expiresAt: Date;
}

export interface SessionUser {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
}

export type ValidationResult =
  | { session: SessionRecord; user: SessionUser }
  | { session: null; user: null };

// ============================================================
// Token helpers
// ============================================================

/** Случайный опаковый токен. 32 байта → 256 бит энтропии. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Hash токена для хранения в БД. sha256 достаточно:
 *  - входной токен уже содержит 256 бит случайности,
 *  - bcrypt/argon2 не нужны — нет brute-force поверхности.
 */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ============================================================
// CRUD
// ============================================================

/**
 * Создаёт новую запись в sessions. Возвращает `SessionRecord`,
 * у которого `id = sha256(token)`. Токен вызывающий код должен
 * положить в cookie сам (см. `lib/auth/cookies.ts#setSessionCookie`).
 */
export async function createSession(
  userId: string,
  token: string,
): Promise<SessionRecord> {
  const sessionId = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_EXPIRES_IN_MS);

  await sql`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (${sessionId}, ${userId}, ${expiresAt})
  `;

  return { id: sessionId, userId, expiresAt };
}

/**
 * Валидирует токен из cookie.
 *  - нет такой сессии → { session: null, user: null }
 *  - истекла          → удаляет и возвращает null
 *  - пользователь is_active=false → удаляет сессию и возвращает null
 *  - близко к истечению → продлевает expires_at
 * Возвращает связанного пользователя одним запросом (JOIN).
 */
export async function validateSessionToken(
  token: string,
): Promise<ValidationResult> {
  const sessionId = hashSessionToken(token);

  const rows = await sql<
    Array<{
      session_id: string;
      session_user_id: string;
      session_expires_at: Date;
      user_id: string;
      username: string;
      email: string | null;
      full_name: string | null;
      role: UserRole;
      avatar_url: string | null;
      is_active: boolean;
    }>
  >`
    SELECT
      s.id         AS session_id,
      s.user_id    AS session_user_id,
      s.expires_at AS session_expires_at,
      u.id         AS user_id,
      u.username,
      u.email,
      u.full_name,
      u.role,
      u.avatar_url,
      u.is_active
    FROM sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.id = ${sessionId}
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) {
    return { session: null, user: null };
  }

  // Защита от использования деактивированного аккаунта.
  if (!row.is_active) {
    await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
    return { session: null, user: null };
  }

  const expiresAt = new Date(row.session_expires_at);
  const now = Date.now();

  // Истекла.
  if (now >= expiresAt.getTime()) {
    await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
    return { session: null, user: null };
  }

  // Sliding expiration — продлеваем, если осталось меньше половины.
  let finalExpiresAt = expiresAt;
  if (now >= expiresAt.getTime() - SESSION_RENEW_THRESHOLD_MS) {
    finalExpiresAt = new Date(now + SESSION_EXPIRES_IN_MS);
    await sql`
      UPDATE sessions
      SET expires_at = ${finalExpiresAt}
      WHERE id = ${sessionId}
    `;
  }

  return {
    session: {
      id: row.session_id,
      userId: row.session_user_id,
      expiresAt: finalExpiresAt,
    },
    user: {
      id: row.user_id,
      username: row.username,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
      avatar_url: row.avatar_url,
      is_active: row.is_active,
    },
  };
}

/** Инвалидирует одну сессию (logout с конкретного устройства). */
export async function invalidateSession(sessionId: string): Promise<void> {
  await sql`DELETE FROM sessions WHERE id = ${sessionId}`;
}

/** Выкидывает все активные сессии пользователя (смена пароля, compromise). */
export async function invalidateAllUserSessions(
  userId: string,
): Promise<void> {
  await sql`DELETE FROM sessions WHERE user_id = ${userId}`;
}

/**
 * Опциональный housekeeping — удалять протухшие записи.
 * Вызывать из cron или on-demand; не критично, т.к. validate
 * и так режет истёкшие записи при обращении.
 */
export async function deleteExpiredSessions(): Promise<void> {
  await sql`DELETE FROM sessions WHERE expires_at < NOW()`;
}
