import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  cdekFetch,
  CdekApiError,
  isCdekConfigured,
  type CdekDeliveryPoint,
} from "@/lib/cdek";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MOCK_POINTS = [
  {
    code: "KHM1",
    name: "ПВЗ Ханты-Мансийск, ул. Парковая 92 Б",
    type: "PVZ",
    address: "г. Ханты-Мансийск, ул. Парковая, 92 Б",
    city: "Ханты-Мансийск",
    work_time: "Пн-Пт 09:00-19:00",
    phones: ["+79324247740"],
    latitude: 61.0028,
    longitude: 69.0189,
    have_cashless: true,
    have_cash: true,
    is_dressing_room: false,
  },
];

export async function GET(request: NextRequest) {
  // BUG-013: rate-limit на публичный эндпоинт
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`cdek-pvz:${ip}`, 30, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов" },
      { status: 429 },
    );
  }

  const cityCode = request.nextUrl.searchParams.get("city_code");
  const type = request.nextUrl.searchParams.get("type") ?? "PVZ";

  if (!cityCode) {
    return NextResponse.json(
      { error: "city_code обязателен" },
      { status: 400 },
    );
  }

  const cityCodeNum = Number(cityCode);
  if (!Number.isFinite(cityCodeNum) || cityCodeNum <= 0) {
    return NextResponse.json(
      { error: "city_code должен быть числом" },
      { status: 400 },
    );
  }

  if (!["PVZ", "POSTAMAT", "ALL"].includes(type)) {
    return NextResponse.json(
      { error: "Некорректный type" },
      { status: 400 },
    );
  }

  if (!isCdekConfigured()) {
    return NextResponse.json({ points: MOCK_POINTS, mock: true });
  }

  try {
    const points = await cdekFetch<CdekDeliveryPoint[]>("/deliverypoints", {
      params: {
        city_code: cityCode,
        type,
        country_code: "RU",
      },
    });

    return NextResponse.json({
      points: (points ?? []).map((p) => ({
        code: p.code,
        name: p.name,
        type: p.type,
        address: p.location?.address_full || p.location?.address || "",
        city: p.location?.city || "",
        work_time: p.work_time,
        phones: p.phones?.map((ph) => ph.number) || [],
        latitude: p.location?.latitude,
        longitude: p.location?.longitude,
        have_cashless: p.have_cashless,
        have_cash: p.have_cash,
        is_dressing_room: p.is_dressing_room,
      })),
    });
  } catch (err) {
    if (err instanceof CdekApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Ошибка получения ПВЗ" }, { status: 500 });
  }
}
