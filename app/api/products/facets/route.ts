import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getProductFacets } from "@/lib/data/catalog";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`facets:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов" },
      { status: 429 },
    );
  }

  const sp = request.nextUrl.searchParams;
  const categoryIdRaw = sp.get("category_id");
  const search = sp.get("search");

  const categoryId = categoryIdRaw ? Number(categoryIdRaw) : null;
  if (categoryIdRaw && (!Number.isFinite(categoryId) || (categoryId ?? 0) <= 0)) {
    return NextResponse.json({ error: "Invalid category_id" }, { status: 400 });
  }

  try {
    const facets = await getProductFacets({
      categoryId,
      search: search && search.length <= 200 ? search : null,
    });
    return NextResponse.json(facets);
  } catch (err) {
    console.error("[api/products/facets]", err);
    return NextResponse.json(
      { error: "Ошибка загрузки фильтров" },
      { status: 500 },
    );
  }
}
