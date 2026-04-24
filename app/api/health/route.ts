import "server-only";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Health-check endpoint.
 * Возвращает 200 {status:"healthy"} если всё ок, 503 {status:"degraded"}
 * если БД настроена, но запрос упал.
 * Если DATABASE_URL не задан, клиент выбросит при импорте — но т.к. мы здесь
 * вызываем ping в try/catch, деградация обрабатывается корректно.
 */
export async function GET() {
  const checks: Record<string, "ok" | "error" | "not_configured"> = {};
  let healthy = true;

  checks.nextjs = "ok";

  if (process.env.DATABASE_URL) {
    try {
      await sql`SELECT 1 AS ok`;
      checks.database = "ok";
    } catch (err) {
      console.error("[health] DB ping failed:", err);
      checks.database = "error";
      healthy = false;
    }
  } else {
    checks.database = "not_configured";
  }

  const cdekConfigured = !!(
    process.env.CDEK_CLIENT_ID && process.env.CDEK_CLIENT_SECRET
  );
  checks.cdek_api = cdekConfigured ? "ok" : "not_configured";

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
