import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

const CONTENT_MANAGER_PATHS = ["/admin/blog", "/admin/content"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Если Supabase не сконфигурирован (Этап 1 без реальных ключей) — пропускаем
  // all запросы. Защита /admin/* добавится автоматически когда появится env.
  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLogin = pathname === "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin");

  if (!isAdminRoute && !isAdminApi) {
    return supabaseResponse;
  }

  if (isAdminLogin) {
    if (user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/dashboard";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  if (!user) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    if (!profile) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Профиль не найден" }, { status: 403 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    const p = profile as Record<string, unknown>;

    if (!p.is_active) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Аккаунт деактивирован" }, { status: 403 });
      }
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    const role = String(p.role);

    if (role === "content") {
      const isAllowed = CONTENT_MANAGER_PATHS.some((p) => pathname.startsWith(p));
      const isAdminRoot = pathname === "/admin" || pathname === "/admin/";

      if (!isAllowed && !isAdminRoot) {
        if (isAdminApi) {
          return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
        }
        const url = request.nextUrl.clone();
        url.pathname = "/admin/blog";
        return NextResponse.redirect(url);
      }
    }
  } catch {
    // profile check failed — let individual API handlers deal with auth
  }

  return supabaseResponse;
}
