import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getCategoryTree } from "@/lib/data/catalog";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`categories:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов" },
      { status: 429 },
    );
  }

  try {
    const categories = await getCategoryTree();
    return NextResponse.json({ categories });
  } catch (err) {
    console.error("[api/categories]", err);
    return NextResponse.json(
      { error: "Ошибка загрузки категорий" },
      { status: 500 },
    );
  }
}
