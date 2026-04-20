import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  getRelatedProducts,
  getProductBySlugWithRelations,
} from "@/lib/data/catalog";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9-]{1,100}$/;

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`related:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов" },
      { status: 429 },
    );
  }

  const { slug } = await ctx.params;
  if (!slug || !SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
  }

  const product = await getProductBySlugWithRelations(slug);
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const limitRaw = Number(request.nextUrl.searchParams.get("limit") ?? 4);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(12, Math.max(1, Math.floor(limitRaw)))
    : 4;

  try {
    const products = await getRelatedProducts(product.id, limit);
    return NextResponse.json({ products });
  } catch (err) {
    console.error("[api/products/[slug]/related]", err);
    return NextResponse.json(
      { error: "Ошибка загрузки похожих" },
      { status: 500 },
    );
  }
}
