import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Health-check endpoint (D-043).
 * Возвращает 200 {status:"healthy"} если всё ок, 503 {status:"degraded"}
 * если Supabase настроен, но запрос к нему упал.
 * Если переменные env не заданы — это не ошибка, а "not_configured",
 * статус всё равно 200 (Этап 1 деплоится до подключения БД).
 */
export async function GET() {
  const checks: Record<string, "ok" | "error" | "not_configured"> = {};
  let healthy = true;

  checks.nextjs = "ok";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    supabaseUrl &&
    supabaseKey &&
    !supabaseUrl.includes("placeholder") &&
    !supabaseUrl.includes("localhost")
  ) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { error } = await supabase.from("settings").select("key").limit(1);
      checks.supabase = error ? "error" : "ok";
      if (error) healthy = false;
    } catch {
      checks.supabase = "error";
      healthy = false;
    }
  } else {
    checks.supabase = "not_configured";
  }

  const cdekConfigured = !!(
    process.env.CDEK_CLIENT_ID && process.env.CDEK_CLIENT_SECRET
  );
  checks.cdek_api = cdekConfigured ? "ok" : "not_configured";

  const payConfigured = !!(
    process.env.CDEK_PAY_SHOP_LOGIN && process.env.CDEK_PAY_SECRET_KEY
  );
  checks.cdek_pay = payConfigured ? "ok" : "not_configured";

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
      uptime: process.uptime(),
      checks,
    },
    { status: healthy ? 200 : 503 },
  );
}
