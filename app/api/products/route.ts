import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listProducts } from "@/lib/data/catalog";
import { parseBody } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { ProductSort } from "@/types";
import type { ProductPricingMode } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  category: z.string().max(100).optional().nullable(),
  pricing_mode: z.enum(["fixed", "calculator", "quote"]).optional().nullable(),
  price_min: z.coerce.number().finite().min(0).optional().nullable(),
  price_max: z.coerce.number().finite().min(0).optional().nullable(),
  search: z.string().max(200).optional().nullable(),
  sort: z
    .enum(["popular", "newest", "price_asc", "price_desc", "rating", "featured"])
    .optional()
    .default("popular"),
  page: z.coerce.number().int().min(1).max(1000).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(60).optional().default(24),
});

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`products-list:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов" },
      { status: 429 },
    );
  }

  const raw: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((v, k) => {
    if (v !== "") raw[k] = v;
  });

  const parsed = parseBody(querySchema, raw);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const q = parsed.data;

  try {
    const result = await listProducts({
      categorySlug: q.category ?? null,
      pricingMode: (q.pricing_mode ?? null) as ProductPricingMode | null,
      priceMin: q.price_min ?? null,
      priceMax: q.price_max ?? null,
      search: q.search ?? null,
      sort: q.sort as ProductSort,
      page: q.page,
      perPage: q.per_page,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/products]", err);
    return NextResponse.json(
      { error: "Ошибка загрузки каталога" },
      { status: 500 },
    );
  }
}
