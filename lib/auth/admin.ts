import { NextResponse } from "next/server";
import type { UserRole } from "@/types/database";

interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
}

/**
 * STUB AUTH (TODO LUCIA — цепочка 2).
 * До перехода на Lucia v3 функция всегда возвращает захардкоженного админа.
 * Сохранён исходный контракт `Promise<AdminUser | NextResponse>` чтобы не
 * ломать существующие API-роуты, использующие `isResponse(auth)`.
 */
const STUB_ADMIN: AdminUser = {
  id: "dev-admin",
  email: "admin@2x2.local",
  role: "owner",
  full_name: "Dev Admin",
};

export async function requireAdmin(
  allowedRoles?: UserRole[],
): Promise<AdminUser | NextResponse> {
  const roles = allowedRoles ?? ["owner", "manager", "content"];
  if (!roles.includes(STUB_ADMIN.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }
  return STUB_ADMIN;
}

export function isResponse(
  val: AdminUser | NextResponse,
): val is NextResponse {
  return val instanceof NextResponse;
}

export async function getCurrentUser(): Promise<{
  id: string;
  email: string;
} | null> {
  return { id: STUB_ADMIN.id, email: STUB_ADMIN.email };
}

export async function getUserRole(): Promise<UserRole | null> {
  return STUB_ADMIN.role;
}

export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "owner" || role === "manager";
}
