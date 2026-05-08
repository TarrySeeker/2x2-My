import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge middleware.
 *
 * Задачи:
 *   1. Не пускать неавторизованных пользователей в /admin/*.
 *   2. Прокидывать `x-pathname` в request headers (server components
 *      читают через `headers().get('x-pathname')` — для role-based
 *      guard в admin layout).
 *   3. Поверх Next.js no-store-дефолта для force-dynamic страниц
 *      ставить осмысленный Cache-Control с CDN-friendly s-maxage
 *      на публичных страницах витрины. Без этого Caddy/CDN не могут
 *      кешировать HTML вообще, и каждый visitor вызывает SSR.
 *
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

/**
 * Регэкспы публичных HTML-страниц витрины, для которых хотим CDN-cache.
 *
 * Стратегия: `private, no-cache, max-age=0, s-maxage=60, stale-while-revalidate=300`
 *   - `private` — браузер не кеширует agressively (защита от back-button stale UI),
 *   - `s-maxage=60` — Caddy/Cloudflare/Timeweb-CDN кешируют ровно 60 сек
 *      (совпадает с unstable_cache внутри витрины),
 *   - `stale-while-revalidate=300` — следующие 5 мин CDN отдаёт прошлый
 *      HTML, пока в фоне делает re-fetch.
 *
 * Не кешируем: /admin, /api, /404, и любые ответы с set-cookie (логин,
 * заявки) — там Cache-Control оставляем как есть, чтобы Next/Caddy
 * сами проставили no-store.
 */
const PUBLIC_HTML_PATHS = [
  /^\/$/,
  /^\/about(\/.*)?$/,
  /^\/services(\/.*)?$/,
  /^\/portfolio(\/.*)?$/,
  /^\/blog(\/.*)?$/,
  /^\/faq$/,
  /^\/contacts$/,
  /^\/privacy$/,
  /^\/terms$/,
];

function shouldCacheHtml(pathname: string): boolean {
  return PUBLIC_HTML_PATHS.some((re) => re.test(pathname));
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Прокидываем pathname в headers — server components читают его
  // через `headers().get('x-pathname')`. Это нужно для force-change
  // password redirect и role-based guard в `app/admin/layout.tsx`.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // Логин не защищаем (иначе петля).
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Защита /admin/*.
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Публичный HTML с поддержкой CDN-cache (s-maxage=60).
  if (shouldCacheHtml(pathname)) {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    // Не перетираем, если Next уже поставил конкретное значение
    // (например, set-cookie → должно стать no-store автоматически).
    // Но force-dynamic страницы по умолчанию идут с no-store, так что
    // мы выставляем CDN-friendly заголовок поверх.
    res.headers.set(
      "Cache-Control",
      "private, no-cache, max-age=0, s-maxage=60, stale-while-revalidate=300",
    );
    return res;
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Раньше matcher был только /admin/:path*. Расширяем на весь сайт,
  // исключая статику и Next-internals (иначе оверхед Edge на каждый
  // _next/static asset).
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|manifest.json|api/|.*\\..*).*)",
  ],
};
