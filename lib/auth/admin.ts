import "server-only";

import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import type { UserRole } from "@/types/database";
import {
  validateSessionToken,
  type SessionUser,
} from "@/lib/auth/lucia";
import { getSessionToken } from "@/lib/auth/cookies";

/**
 * Публичный API авторизации для API-роутов / внутренних проверок.
 *
 * Есть два стиля использования:
 *
 *  1. В Route Handler (`app/api/.../route.ts`):
 *     ```
 *     const auth = await requireAdmin();
 *     if (isResponse(auth)) return auth;    // 401/403
 *     // auth — SessionUser
 *     ```
 *     Возвращает 401 если нет cookie, 401 если cookie невалидна,
 *     403 если роль не подходит.
 *
 *  2. В Server Component / Server Action — использовать
 *     `@/features/auth/api#requireAdmin` / `#requireAuth`, которые
 *     бросают redirect на /admin/login.
 */

export type AdminUser = SessionUser;

const DEFAULT_ADMIN_ROLES: UserRole[] = ["owner", "manager", "content"];

export async function requireAdmin(
  allowedRoles?: UserRole[],
): Promise<AdminUser | NextResponse> {
  const roles = allowedRoles ?? DEFAULT_ADMIN_ROLES;

  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { session, user } = await validateSessionToken(token);
  if (!session || !user) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  return user;
}

export function isResponse(
  val: AdminUser | NextResponse,
): val is NextResponse {
  return val instanceof NextResponse;
}

/**
 * Вернуть текущего авторизованного пользователя или null.
 * Без редиректа, без NextResponse — для layout / UI-чекинга.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const { user } = await validateSessionToken(token);
  return user;
}

export async function getUserRole(): Promise<UserRole | null> {
  const user = await getCurrentUser();
  return user?.role ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "owner" || role === "manager";
}

/**
 * Вариант для Server Components / Actions: бросает redirect
 * если пользователь не авторизован или не имеет прав.
 * Именно эту функцию использует `features/auth/api#requireAdmin`.
 */
export async function requireAdminRedirect(
  allowedRoles?: UserRole[],
): Promise<SessionUser> {
  const roles = allowedRoles ?? DEFAULT_ADMIN_ROLES;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  if (!roles.includes(user.role)) {
    // Контент-роль не имеет доступа к продуктам/заказам — пускаем в блог.
    if (user.role === "content") {
      redirect("/admin/blog");
    }
    redirect("/");
  }
  return user;
}
