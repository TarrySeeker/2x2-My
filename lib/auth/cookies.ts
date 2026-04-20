import "server-only";

import { cookies } from "next/headers";

/**
 * Работа с cookie, в которой лежит токен сессии Lucia.
 * Только server-side (Server Actions / Route Handlers / Server Components).
 *
 * В cookie хранится **токен**, не id сессии — в БД лежит sha256(token).
 * См. `lib/auth/lucia.ts` для подробностей.
 */

export const SESSION_COOKIE_NAME = "auth_session";

function baseCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export async function setSessionCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    expires: expiresAt,
  });
}

export async function deleteSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, "", {
    ...baseCookieOptions(),
    maxAge: 0,
  });
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(SESSION_COOKIE_NAME)?.value;
  return value && value.length > 0 ? value : null;
}
