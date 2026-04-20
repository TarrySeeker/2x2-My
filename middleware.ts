import { NextResponse, type NextRequest } from "next/server";

/**
 * STUB middleware (TODO LUCIA — цепочка 2).
 * Раньше middleware рефрешил Supabase-сессию и защищал /admin/*.
 * Сейчас просто пропускает все запросы.
 *
 * После Lucia v3:
 *   - читать sessionId из cookie
 *   - валидировать в БД (`sessions` таблица)
 *   - редиректить неавторизованных с /admin/* на /admin/login
 */
export async function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Игнорируем статические файлы и изображения.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
