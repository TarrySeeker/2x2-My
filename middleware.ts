import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware.
 *
 * Задача: не пускать неавторизованных пользователей в /admin/*.
 * НЕ валидируем сессию в БД — Edge runtime не умеет работать с
 * postgres-js (нужен Node). Полная проверка делается в
 * `requireAdmin()` / `getCurrentUser()` на каждой странице (Node runtime).
 *
 * Проверяем только факт наличия cookie `auth_session`. Если cookie
 * отсутствует — редирект на /admin/login. Это защищает от лишнего
 * рендера админских страниц неавторизованными посетителями, но не
 * заменяет валидацию сессии (злоумышленник может подставить мусорный
 * cookie — страница упадёт в redirect уже из requireAdmin).
 *
 * Имя cookie — должно совпадать с `SESSION_COOKIE_NAME` из
 * `lib/auth/cookies.ts`. Захардкожено, т.к. тот модуль помечен
 * `server-only` и не импортируется из Edge runtime.
 */
const SESSION_COOKIE_NAME = "auth_session";

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Логин не защищаем (иначе петля).
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
