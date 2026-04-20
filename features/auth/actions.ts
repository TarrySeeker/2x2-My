"use server";

import { z } from "zod";

import { signIn, signOut } from "@/features/auth/api";

/**
 * Server Actions для /admin/login.
 *
 * Основной API — `loginAction(email, password)` и `logoutAction()`,
 * его использует существующий UI (`app/admin/login/page.tsx`).
 *
 * Дополнительно экспортированы `signInAction` / `signOutAction` под
 * новый `useFormState`-контракт (formData → prevState → next state),
 * чтобы при редизайне формы можно было переключиться без изменения
 * серверного кода.
 */

export async function loginAction(
  email: string,
  password: string,
): Promise<{ error: string | null }> {
  const error = await signIn(email, password);
  return { error };
}

export async function logoutAction(): Promise<never> {
  return signOut();
}

// ============================================================
// useFormState-варианты (для нового UI с progressive enhancement)
// ============================================================

const loginSchema = z.object({
  email: z.string().min(1).max(128),
  password: z.string().min(1).max(128),
});

export interface LoginActionState {
  error: string | null;
}

export async function signInAction(
  _prevState: LoginActionState | null,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email") ?? formData.get("username") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    return { error: "Введите логин и пароль" };
  }
  const error = await signIn(parsed.data.email, parsed.data.password);
  return { error };
}

export async function signOutAction(): Promise<never> {
  return signOut();
}
