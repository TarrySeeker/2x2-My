import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
}

/**
 * Проверяет, что текущий пользователь — админ с одной из разрешённых ролей.
 * Возвращает либо объект AdminUser, либо NextResponse с ошибкой (401/403).
 * Используется в начале admin API-роутов:
 *
 *   const auth = await requireAdmin(["owner", "manager"]);
 *   if (isResponse(auth)) return auth;
 */
export async function requireAdmin(
  allowedRoles?: UserRole[],
): Promise<AdminUser | NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, role, full_name, is_active")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Профиль не найден" }, { status: 403 });
    }

    const p = profile as Record<string, unknown>;

    if (!p.is_active) {
      return NextResponse.json(
        { error: "Аккаунт деактивирован" },
        { status: 403 },
      );
    }

    const role = p.role as UserRole;
    const roles = allowedRoles ?? ["owner", "manager", "content"];

    if (!roles.includes(role)) {
      return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
    }

    return {
      id: String(p.id),
      email: String(p.email),
      role,
      full_name: p.full_name ? String(p.full_name) : null,
    };
  } catch {
    return NextResponse.json({ error: "Ошибка авторизации" }, { status: 401 });
  }
}

export function isResponse(
  val: AdminUser | NextResponse,
): val is NextResponse {
  return val instanceof NextResponse;
}

export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function getUserRole(): Promise<UserRole | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return ((data as { role?: UserRole } | null)?.role as UserRole) ?? null;
  } catch {
    return null;
  }
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "owner" || role === "manager";
}
