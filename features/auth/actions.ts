"use server";

import { signIn, signOut } from "@/features/auth/api";

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
