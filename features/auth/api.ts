import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/supabase/table-types";

type Profile = Row<"profiles">;

/**
 * Авторизация по email + пароль.
 * Возвращает ошибку в виде строки или null при успехе.
 */
export async function signIn(
  email: string,
  password: string,
): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return error.message;
  return null;
}

/**
 * Выход из системы + редирект на страницу входа.
 */
export async function signOut(): Promise<never> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/**
 * Получить текущую сессию (user).
 * Возвращает null если не авторизован.
 */
export async function getSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Получить профиль текущего пользователя.
 * Возвращает null если нет сессии или профиля.
 */
export async function getProfile(): Promise<Profile | null> {
  const user = await getSession();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

/**
 * Требует авторизацию (любая роль).
 * Если пользователь не авторизован или неактивен — редирект на /admin/login.
 */
export async function requireAuth(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile || !profile.is_active) {
    redirect("/admin/login");
  }
  return profile;
}

/**
 * Требует роль owner или manager.
 * content-менеджер получит редирект на /admin/blog.
 */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.role === "content") {
    redirect("/admin/blog");
  }
  return profile;
}
