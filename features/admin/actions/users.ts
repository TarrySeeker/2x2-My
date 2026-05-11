"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { z } from "zod";

import { requireOwner } from "@/features/auth/api";
import { sql } from "@/lib/db/client";
import { invalidateAllUserSessions } from "@/lib/auth/lucia";
import type { UserRole } from "@/types/database";

/**
 * Server-actions для управления админами команды (`users`).
 *
 * Доступ: только owner. Защита через `requireOwner()` — manager и
 * content не могут добавлять/удалять пользователей или менять роли.
 *
 * Поток создания нового админа:
 *   1. Owner вводит username, email (опц.), полное имя, роль.
 *   2. Action генерирует временный пароль (16 символов base64url).
 *   3. Создаёт пользователя с must_change_password = true (поле уже
 *      есть в схеме, см. 004_lucia_auth.sql + расширения).
 *   4. Возвращает временный пароль ОДИН раз — owner копирует и
 *      передаёт новому админу. Сохранять в БД незахэшированным
 *      нельзя, поэтому если owner потерял — нужно сбросить через
 *      отдельный action.
 *
 * Поток смены роли существующего:
 *   - `updateUserRoleAction(id, role)` — простой UPDATE + invalidate
 *     всех сессий пользователя (чтобы новая роль применилась немедленно
 *     при следующем запросе).
 *
 * Защита от самоблокировки:
 *   - Owner не может разжаловать сам себя или деактивировать (иначе
 *     потеряет доступ к админке). Эти проверки делаются в action.
 *   - Нельзя удалить последнего активного owner — проверяем COUNT.
 */

const ROLE_VALUES: readonly UserRole[] = ["owner", "manager", "content"];
const userRoleSchema = z.enum(["owner", "manager", "content"]);

const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Логин — минимум 3 символа")
    .max(64, "Логин — максимум 64 символа")
    .regex(/^[a-z0-9_.-]+$/i, "Только латиница, цифры, _ . -"),
  email: z
    .string()
    .trim()
    .email("Некорректный email")
    .max(128)
    .or(z.literal(""))
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toLowerCase() : null)),
  full_name: z
    .string()
    .trim()
    .max(128)
    .or(z.literal(""))
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  role: userRoleSchema,
});

const idSchema = z.string().min(1).max(128);

export interface CreateUserResult {
  ok: boolean;
  error?: string;
  /** Сгенерированный временный пароль — показать ОДИН раз. */
  tempPassword?: string;
  userId?: string;
}

/**
 * Генерация cuid-подобного TEXT id (соответствует Lucia spec).
 * Без зависимости от стороннего пакета — 24 символа base32.
 */
function generateUserId(): string {
  return randomBytes(15).toString("base64url").slice(0, 24);
}

function generateTempPassword(): string {
  // 16 символов base64url ~= 96 бит энтропии. Достаточно для одноразового
  // пароля, который сразу будет заменён через must_change_password flow.
  return randomBytes(12).toString("base64url");
}

export async function createUserAction(
  data: unknown,
): Promise<CreateUserResult> {
  const profile = await requireOwner();

  const parsed = createUserSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Невалидные данные",
    };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const userId = generateUserId();

  try {
    await sql`
      INSERT INTO users (
        id, username, email, full_name, password_hash, role,
        is_active, must_change_password, created_at, updated_at
      )
      VALUES (
        ${userId},
        ${parsed.data.username.toLowerCase()},
        ${parsed.data.email},
        ${parsed.data.full_name},
        ${passwordHash},
        ${parsed.data.role},
        true,
        true,
        NOW(),
        NOW()
      )
    `;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Не удалось создать";
    if (message.includes("users_username_key")) {
      return { ok: false, error: "Пользователь с таким логином уже существует" };
    }
    if (message.includes("users_email_key")) {
      return { ok: false, error: "Пользователь с таким email уже существует" };
    }
    return { ok: false, error: message };
  }

  // Audit. Best-effort — не блокирует создание.
  try {
    await sql`
      SELECT log_admin_action(
        ${profile.id},
        'users.create',
        'users',
        ${userId},
        NULL,
        ${sql.json({
          username: parsed.data.username,
          role: parsed.data.role,
        } as unknown as Parameters<typeof sql.json>[0])},
        NULL,
        NULL
      )
    `;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[users.create audit]", err);
    }
  }

  revalidatePath("/admin/settings");

  return {
    ok: true,
    userId,
    tempPassword,
  };
}

export interface UserActionResult {
  ok: boolean;
  error?: string;
}

/**
 * Сменить роль существующего пользователя.
 * Owner не может разжаловать сам себя.
 * Нельзя оставить систему без активного owner.
 */
export async function updateUserRoleAction(
  rawId: unknown,
  rawRole: unknown,
): Promise<UserActionResult> {
  const actor = await requireOwner();

  const idResult = idSchema.safeParse(rawId);
  const roleResult = userRoleSchema.safeParse(rawRole);
  if (!idResult.success || !roleResult.success) {
    return { ok: false, error: "Некорректные параметры" };
  }

  const userId = idResult.data;
  const newRole = roleResult.data;

  if (userId === actor.id && newRole !== "owner") {
    return {
      ok: false,
      error: "Нельзя разжаловать самого себя — попросите другого owner.",
    };
  }

  // Если меняем чужого owner на не-owner — проверим, что ещё хотя бы
  // один активный owner останется.
  if (newRole !== "owner") {
    const rows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::INT AS count
      FROM users
      WHERE role = 'owner' AND is_active = true AND id != ${userId}
    `;
    const remaining = rows[0]?.count ?? 0;
    if (remaining === 0) {
      return {
        ok: false,
        error: "Нельзя оставить систему без активного владельца.",
      };
    }
  }

  await sql`
    UPDATE users
    SET role = ${newRole}, updated_at = NOW()
    WHERE id = ${userId}
  `;

  // Если меняем чью-то роль — все его сессии стоит инвалидировать,
  // чтобы новые права применились немедленно (RBAC проверяется при
  // каждом обращении к layout, поэтому критично только для тех, кто
  // уже в админке прямо сейчас).
  if (userId !== actor.id) {
    await invalidateAllUserSessions(userId);
  }

  try {
    await sql`
      SELECT log_admin_action(
        ${actor.id},
        'users.update_role',
        'users',
        ${userId},
        NULL,
        ${sql.json({ new_role: newRole } as unknown as Parameters<typeof sql.json>[0])},
        NULL,
        NULL
      )
    `;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[users.update_role audit]", err);
    }
  }

  revalidatePath("/admin/settings");
  return { ok: true };
}

/**
 * Деактивировать пользователя (soft-disable). is_active = false →
 * следующая попытка использовать его сессию упадёт в validateSessionToken.
 */
export async function setUserActiveAction(
  rawId: unknown,
  rawActive: unknown,
): Promise<UserActionResult> {
  const actor = await requireOwner();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success || typeof rawActive !== "boolean") {
    return { ok: false, error: "Некорректные параметры" };
  }
  const userId = idResult.data;
  const isActive = rawActive;

  if (userId === actor.id && !isActive) {
    return { ok: false, error: "Нельзя деактивировать самого себя." };
  }

  // При деактивации owner — проверим, что ещё кто-то активный остался.
  if (!isActive) {
    const rows = await sql<{ role: UserRole; count: number }[]>`
      SELECT role::text AS role, COUNT(*)::INT AS count
      FROM users
      WHERE id = ${userId}
      GROUP BY role
    `;
    if (rows[0]?.role === "owner") {
      const left = await sql<{ count: number }[]>`
        SELECT COUNT(*)::INT AS count
        FROM users
        WHERE role = 'owner' AND is_active = true AND id != ${userId}
      `;
      if ((left[0]?.count ?? 0) === 0) {
        return {
          ok: false,
          error: "Нельзя оставить систему без активного владельца.",
        };
      }
    }
  }

  await sql`
    UPDATE users
    SET is_active = ${isActive}, updated_at = NOW()
    WHERE id = ${userId}
  `;

  if (!isActive) {
    await invalidateAllUserSessions(userId);
  }

  try {
    await sql`
      SELECT log_admin_action(
        ${actor.id},
        ${isActive ? "users.activate" : "users.deactivate"},
        'users',
        ${userId},
        NULL,
        NULL,
        NULL,
        NULL
      )
    `;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[users.activate audit]", err);
    }
  }

  revalidatePath("/admin/settings");
  return { ok: true };
}

/**
 * Сбросить пароль произвольного админа. Возвращает новый временный
 * пароль; пользователь будет вынужден сменить его при следующем входе
 * (must_change_password = true).
 */
export async function resetUserPasswordAction(
  rawId: unknown,
): Promise<CreateUserResult> {
  const actor = await requireOwner();

  const idResult = idSchema.safeParse(rawId);
  if (!idResult.success) {
    return { ok: false, error: "Некорректный ID" };
  }
  const userId = idResult.data;

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const updated = await sql<{ id: string }[]>`
    UPDATE users
    SET password_hash = ${passwordHash},
        must_change_password = true,
        failed_login_attempts = 0,
        locked_until = NULL,
        updated_at = NOW()
    WHERE id = ${userId}
    RETURNING id
  `;
  if (updated.length === 0) {
    return { ok: false, error: "Пользователь не найден" };
  }

  await invalidateAllUserSessions(userId);

  try {
    await sql`
      SELECT log_admin_action(
        ${actor.id},
        'users.reset_password',
        'users',
        ${userId},
        NULL,
        NULL,
        NULL,
        NULL
      )
    `;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[users.reset_password audit]", err);
    }
  }

  revalidatePath("/admin/settings");
  return { ok: true, userId, tempPassword };
}

/** Список разрешённых ролей — экспортируем для UI. */
export const USER_ROLES_LIST: readonly UserRole[] = ROLE_VALUES;
