import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import {
  listActivePromotions,
  listPopupPromotions,
  PROMOTIONS_CACHE_TAG,
} from "@/lib/data/promotions";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import type { Promotion } from "@/types";

export const runtime = "nodejs";
// Принудительно динамика — у нас rate-limit и cache-tag,
// `force-static` не подходит. Кеш реализован через unstable_cache.
export const dynamic = "force-dynamic";

/**
 * GET /api/promotions/active
 *
 * Публичный endpoint для витрины:
 *  - `popup`: первая активная акция с `show_as_popup=true` — для
 *    промо-попапа сверху (либо `null`).
 *  - `list`: все активные акции (для блока «Акции» на главной).
 *
 * Кеш: 60 сек на уровне БД-запроса (`unstable_cache`), плюс cache-tag
 * `PROMOTIONS_CACHE_TAG` — инвалидируется server action'ами админки.
 *
 * Rate-limit: 60 запросов в минуту на IP. Достаточно с большим запасом
 * для нормального трафика, защита от лёгкого DDoS.
 */

interface ActivePromotionsResponse {
  popup: Promotion | null;
  list: Promotion[];
}

const getActivePromotions = unstable_cache(
  async (): Promise<ActivePromotionsResponse> => {
    const [list, popups] = await Promise.all([
      listActivePromotions(),
      listPopupPromotions(),
    ]);
    return {
      popup: popups[0] ?? null,
      list,
    };
  },
  ["api-promotions-active"],
  { revalidate: 60, tags: [PROMOTIONS_CACHE_TAG] },
);

export async function GET(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`promotions-active:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов" },
      { status: 429 },
    );
  }

  try {
    const data = await getActivePromotions();

    return NextResponse.json(data, {
      headers: {
        // CDN/браузер: 30 сек свежее, 60 сек stale-while-revalidate.
        "Cache-Control":
          "public, max-age=30, s-maxage=60, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    console.error("[api/promotions/active]", err);
    return NextResponse.json(
      { popup: null, list: [], error: "Ошибка сервера" },
      { status: 500 },
    );
  }
}
