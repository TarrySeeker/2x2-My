import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  getProductBySlugWithRelations,
  getRelatedProducts,
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
  const rl = rateLimit(`product-slug:${ip}`, 60, 60_000);
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

  try {
    const product = await getProductBySlugWithRelations(slug);
    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const withRelated = request.nextUrl.searchParams.get("related") === "1";
    const related = withRelated
      ? await getRelatedProducts(product.id, 4)
      : undefined;

    return NextResponse.json({ product, related });
  } catch (err) {
    console.error("[api/products/[slug]]", err);
    return NextResponse.json(
      { error: "Ошибка загрузки товара" },
      { status: 500 },
    );
  }
}
