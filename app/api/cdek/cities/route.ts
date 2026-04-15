import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  cdekFetch,
  CdekApiError,
  isCdekConfigured,
  type CdekCity,
} from "@/lib/cdek";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Minimal mock для Этапа 1 — когда CDEK не настроен.
const MOCK_CITIES = [
  { code: 1104, city: "Ханты-Мансийск", region: "Ханты-Мансийский АО", sub_region: "Югра", postal_codes: ["628011"] },
  { code: 435, city: "Сургут", region: "Ханты-Мансийский АО", sub_region: "Югра", postal_codes: ["628400"] },
  { code: 44, city: "Москва", region: "Москва", sub_region: undefined, postal_codes: ["101000"] },
  { code: 137, city: "Санкт-Петербург", region: "Санкт-Петербург", sub_region: undefined, postal_codes: ["190000"] },
  { code: 438, city: "Нижневартовск", region: "Ханты-Мансийский АО", sub_region: "Югра", postal_codes: ["628600"] },
  { code: 1124, city: "Тюмень", region: "Тюменская область", sub_region: undefined, postal_codes: ["625000"] },
];

// ── TTL-cache (BUG-014) ─────────────────────────────────────────
// Ключ = `${query.toLowerCase()}:${size}`. TTL 6 часов.
// Список городов СДЭК меняется крайне редко, а трафик на автокомплите
// большой — кэш снимает 95%+ обращений к API.
type CitiesResponse = {
  cities: Array<{
    code: number;
    city: string;
    region?: string;
    sub_region?: string;
    postal_codes?: string[];
  }>;
};

interface CacheEntry {
  data: CitiesResponse;
  expiresAt: number;
}

const TTL_MS = 6 * 60 * 60 * 1000; // 6 часов
const MAX_ENTRIES = 500;
const citiesCache = new Map<string, CacheEntry>();

function cacheGet(key: string): CitiesResponse | null {
  const entry = citiesCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    citiesCache.delete(key);
    return null;
  }
  return entry.data;
}

function cacheSet(key: string, data: CitiesResponse) {
  if (citiesCache.size >= MAX_ENTRIES) {
    // Простая эвикция — удаляем половину самых старых записей
    const now = Date.now();
    for (const [k, v] of citiesCache) {
      if (v.expiresAt <= now) citiesCache.delete(k);
    }
    if (citiesCache.size >= MAX_ENTRIES) {
      const keysToDrop = Array.from(citiesCache.keys()).slice(
        0,
        Math.floor(MAX_ENTRIES / 2),
      );
      for (const k of keysToDrop) citiesCache.delete(k);
    }
  }
  citiesCache.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

export async function GET(request: NextRequest) {
  // BUG-013: rate-limit на публичный эндпоинт
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`cdek-cities:${ip}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов" },
      { status: 429 },
    );
  }

  const query = (request.nextUrl.searchParams.get("query") ?? "").trim();
  const size = Math.min(
    Number(request.nextUrl.searchParams.get("size") ?? 10),
    50,
  );

  if (query.length < 2) {
    return NextResponse.json({ cities: [] });
  }

  const cacheKey = `${query.toLowerCase()}:${size}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cached: true });
  }

  if (!isCdekConfigured()) {
    const q = query.toLowerCase();
    const payload: CitiesResponse = {
      cities: MOCK_CITIES.filter((c) => c.city.toLowerCase().includes(q)).slice(
        0,
        size,
      ),
    };
    cacheSet(cacheKey, payload);
    return NextResponse.json({ ...payload, mock: true });
  }

  try {
    const cities = await cdekFetch<CdekCity[]>("/location/cities", {
      params: {
        city: query,
        country_codes: "RU",
        size,
      },
    });

    const payload: CitiesResponse = {
      cities: (cities ?? []).map((c) => ({
        code: c.code,
        city: c.city,
        region: c.region,
        sub_region: c.sub_region,
        postal_codes: c.postal_codes,
      })),
    };
    cacheSet(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof CdekApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Ошибка поиска городов" },
      { status: 500 },
    );
  }
}
