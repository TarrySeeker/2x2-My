import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getRelatedProducts } from "@/lib/data/catalog";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`related:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов" },
      { status: 429 },
    );
  }

  const { id } = await ctx.params;
  const productId = Number(id);
  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? 4);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(12, Math.max(1, Math.floor(limitRaw)))
    : 4;

  try {
    const products = await getRelatedProducts(productId, limit);
    return NextResponse.json({ products });
  } catch (err) {
    console.error("[api/products/[id]/related]", err);
    return NextResponse.json(
      { error: "Ошибка загрузки похожих" },
      { status: 500 },
    );
  }
}
