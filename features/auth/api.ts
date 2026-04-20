import "server-only";

import { redirect } from "next/navigation";
import type { Row } from "@/lib/db/table-types";

type Profile = Row<"profiles">;

/**
 * STUB AUTH (TODO LUCIA — цепочка 2):
 * Эти функции временно возвращают захардкоженного админа без реальной
 * аутентификации. После миграции на Lucia v3 (цепочка 2) — переписать
 * на работу с таблицами `users` и `sessions` (миграция 004) и cookie-сессиями.
 */
const STUB_ADMIN: Profile = {
  id: "dev-admin",
  email: "admin@2x2.local",
  full_name: "Dev Admin",
  phone: null,
  role: "owner",
  avatar_url: null,
  is_active: true,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

/**
 * Авторизация по email + пароль.
 * STUB: всегда возвращает null (успех) для admin@2x2.local.
 */
export async function signIn(
  email: string,
  _password: string,
): Promise<string | null> {
  if (!email) return "Введите email";
  // TODO LUCIA: проверять пароль через bcrypt и создавать сессию
  return null;
}

/**
 * Выход из системы + редирект на страницу входа.
 */
export async function signOut(): Promise<never> {
  // TODO LUCIA: удалять сессию из БД и очищать cookie
  redirect("/admin/login");
}

/**
 * Получить текущую сессию (user).
 * STUB: всегда возвращает stub-юзера.
 */
export async function getSession(): Promise<{ id: string; email: string } | null> {
  // TODO LUCIA: читать sessionId из cookie и валидировать в БД
  return { id: STUB_ADMIN.id, email: STUB_ADMIN.email };
}

/**
 * Получить профиль текущего пользователя.
 * STUB: всегда возвращает stub-юзера.
 */
export async function getProfile(): Promise<Profile | null> {
  // TODO LUCIA: SELECT из users WHERE id = session.user_id
  return STUB_ADMIN;
}

/**
 * Требует авторизацию (любая роль).
 * STUB: всегда успешно возвращает stub-юзера.
 */
export async function requireAuth(): Promise<Profile> {
  // TODO LUCIA: при отсутствии сессии — redirect("/admin/login")
  return STUB_ADMIN;
}

/**
 * Требует роль owner или manager.
 * STUB: всегда успешно возвращает stub-юзера (owner).
 */
export async function requireAdmin(): Promise<Profile> {
  // TODO LUCIA: при role === "content" — redirect("/admin/blog")
  return STUB_ADMIN;
}
