import "server-only";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { sql } from "@/lib/db/client";
import {
  createSession,
  generateSessionToken,
  invalidateSession,
  validateSessionToken,
  type SessionUser,
} from "@/lib/auth/lucia";
import {
  deleteSessionCookie,
  getSessionToken,
  setSessionCookie,
} from "@/lib/auth/cookies";
import { getClientIp } from "@/lib/rate-limit";
import type { Profile } from "@/types";
import type { UserRole } from "@/types/database";

/**
 * Высокоуровневый auth-API для проекта «2х2».
 *
 * Публичные функции:
 *  - `signIn(email, password)` — старый стиль, возвращает `error|null`.
 *    Оставлен для совместимости с form-ом на `/admin/login/page.tsx`,
 *    который вызывает `loginAction` → `signIn`.
 *  - `signOut()` — удаляет сессию и редиректит на /admin/login.
 *  - `getSession()`, `getProfile()` — для layout/UI-чекинга.
 *  - `requireAuth()`, `requireAdmin()` — для Server Actions:
 *     редиректят, если нет авторизации.
 */

// ============================================================
// Константы rate-limit — защита от brute-force на /admin/login
// ============================================================
// 1. Per-IP rate-limit (in-process Map, для cluster нужен Redis).
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 60_000 * 10; // 10 минут
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

// 2. Per-account lockout (БД, переживает рестарт). Если на аккаунт
//    за короткое время идёт N failed-логинов → users.locked_until = now() + 30m.
const ACCOUNT_LOCKOUT_THRESHOLD = 5;
const ACCOUNT_LOCKOUT_DURATION_MIN = 30;

function recordLoginAttempt(key: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return true;
  }
  if (entry.count >= LOGIN_MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

function resetLoginAttempts(key: string): void {
  loginAttempts.delete(key);
}

// ============================================================
// Helpers
// ============================================================

function toProfile(user: SessionUser): Profile {
  // Profile = Tables["users"]["Row"] (алиас для совместимости).
  // Row требует `password_hash`, lockout-поля и timestamps — наружу
  // НЕ вытягиваем, поэтому добавляем безопасные заглушки. Никакой код
  // не использует эти поля от текущего юзера, но типы хотят их видеть.
  // Реальные значения lockout/must_change_password читаются отдельным
  // SELECT в layout (см. requireAdminRedirect) и в changePasswordAction.
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    password_hash: "",
    role: user.role,
    avatar_url: user.avatar_url,
    is_active: user.is_active,
    must_change_password: false,
    failed_login_attempts: 0,
    locked_until: null,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}

// ============================================================
// Session access
// ============================================================

/** Текущий авторизованный юзер или null. */
export async function getSession(): Promise<
  { id: string; email: string | null } | null
> {
  const token = await getSessionToken();
  if (!token) return null;
  const { user } = await validateSessionToken(token);
  if (!user) return null;
  return { id: user.id, email: user.email };
}

/** Полный profile текущего юзера или null. */
export async function getProfile(): Promise<Profile | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const { user } = await validateSessionToken(token);
  return user ? toProfile(user) : null;
}

// ============================================================
// Guards — для Server Actions
// ============================================================

/** Требует, чтобы пользователь был залогинен (любая роль). */
export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) {
    redirect("/admin/login");
  }
  return profile;
}

/**
 * Требует роль owner или manager.
 * Контент-менеджера отправляет на /admin/blog (единственный доступный раздел).
 */
export async function requireAdmin(
  allowedRoles: UserRole[] = ["owner", "manager"],
): Promise<Profile> {
  const profile = await requireAuth();
  if (!allowedRoles.includes(profile.role)) {
    if (profile.role === "content") {
      redirect("/admin/blog");
    }
    redirect("/");
  }
  return profile;
}

// ============================================================
// signIn / signOut — используются loginAction / logoutAction
// ============================================================

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Введите email или логин")
    .max(128),
  password: z.string().min(6, "Минимум 6 символов").max(128),
});

/**
 * Проверяет credentials, создаёт сессию, пишет cookie.
 * Возвращает `null` при успехе или текст ошибки.
 *
 * Принимает либо email, либо username — удобно для админов,
 * которые не помнят email. В логин-форме поле называется "email"
 * по legacy-причинам (UI был сделан до миграции на username).
 *
 * Rate-limit: 5 попыток на IP за 10 минут. Память — in-process
 * Map, так что работает только для одного инстанса. Для cluster
 * нужно будет вынести в Redis (отдельная задача).
 */
export async function signIn(
  emailOrUsername: string,
  password: string,
): Promise<string | null> {
  const parsed = credentialsSchema.safeParse({
    email: emailOrUsername,
    password,
  });
  if (!parsed.success) {
    return parsed.error.issues[0]?.message ?? "Некорректные данные";
  }

  // Rate-limit по IP — лучше чем по username (usernames брутятся).
  const ip = await safeClientIp();
  if (!recordLoginAttempt(ip)) {
    return "Слишком много попыток. Повторите через 10 минут.";
  }

  const identifier = parsed.data.email.toLowerCase();

  const rows = await sql<
    Array<{
      id: string;
      password_hash: string;
      is_active: boolean;
      failed_login_attempts: number;
      locked_until: string | null;
    }>
  >`
    SELECT id, password_hash, is_active,
           failed_login_attempts, locked_until
    FROM users
    WHERE LOWER(username) = ${identifier}
       OR LOWER(email) = ${identifier}
    LIMIT 1
  `;

  const userRow = rows[0];
  // Намеренно одинаковое сообщение для "не найден" и "неверный пароль"
  // — не утекает информация о существующих логинах.
  const GENERIC_ERROR = "Неверный логин или пароль";

  if (!userRow) {
    // Дополнительно прогоняем bcrypt на фиктивной строке, чтобы
    // уравнять время отклика (timing attack mitigation).
    await bcrypt.compare(password, "$2b$12$" + "a".repeat(53));
    return GENERIC_ERROR;
  }

  if (!userRow.is_active) {
    return "Аккаунт заблокирован";
  }

  // ── Account lockout check ──
  if (userRow.locked_until) {
    const lockedUntil = new Date(userRow.locked_until);
    if (lockedUntil.getTime() > Date.now()) {
      // Запускаем bcrypt всё равно — чтобы тайминг не выдавал состояние блокировки.
      await bcrypt.compare(password, userRow.password_hash);
      return `Аккаунт временно заблокирован, попробуйте через ${ACCOUNT_LOCKOUT_DURATION_MIN} минут`;
    }
  }

  const ok = await bcrypt.compare(password, userRow.password_hash);
  if (!ok) {
    // Регистрируем неудачную попытку. Если порог достигнут — лочим аккаунт.
    try {
      const nextCount = (userRow.failed_login_attempts ?? 0) + 1;
      if (nextCount >= ACCOUNT_LOCKOUT_THRESHOLD) {
        await sql`
          UPDATE users
          SET failed_login_attempts = 0,
              locked_until = NOW() + make_interval(mins => ${ACCOUNT_LOCKOUT_DURATION_MIN}),
              updated_at = NOW()
          WHERE id = ${userRow.id}
        `;
      } else {
        await sql`
          UPDATE users
          SET failed_login_attempts = ${nextCount},
              updated_at = NOW()
          WHERE id = ${userRow.id}
        `;
      }
    } catch (err) {
      console.warn("[signIn] failed to update lockout counters:", err);
    }
    return GENERIC_ERROR;
  }

  // Успешный вход — сбрасываем счётчики.
  try {
    await sql`
      UPDATE users
      SET failed_login_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
      WHERE id = ${userRow.id}
    `;
  } catch (err) {
    console.warn("[signIn] failed to reset lockout counters:", err);
  }

  const token = generateSessionToken();
  const session = await createSession(userRow.id, token);
  await setSessionCookie(token, session.expiresAt);
  resetLoginAttempts(ip);
  return null;
}

/** Удаляет сессию из БД, чистит cookie, редиректит на /admin/login. */
export async function signOut(): Promise<never> {
  const token = await getSessionToken();
  if (token) {
    const { session } = await validateSessionToken(token);
    if (session) {
      await invalidateSession(session.id);
    }
  }
  await deleteSessionCookie();
  redirect("/admin/login");
}

/** IP для rate-limit; если не удалось — используем "unknown" bucket. */
async function safeClientIp(): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return getClientIp(h) ?? "unknown";
  } catch {
    return "unknown";
  }
}
