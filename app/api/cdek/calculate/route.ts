import "server-only";
import { NextRequest, NextResponse } from "next/server";
import {
  cdekFetch,
  CdekApiError,
  IM_TARIFF_CODES,
  isCdekConfigured,
  type CdekTariffListResponse,
  type CdekCalculateResponse,
} from "@/lib/cdek";
import { parseBody, cdekCalculateSchema } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FROM_CITY_CODE = Number(
  process.env.CDEK_FROM_LOCATION_CODE ??
    process.env.CDEK_FROM_CITY_CODE ??
    1104,
);

interface TariffRow {
  tariff_code: number;
  tariff_name: string;
  delivery_sum: number;
  period_min: number;
  period_max: number;
  mode: "door" | "office";
}

// Заглушки на Этап 1 — когда СДЭК не настроен. Реалистичные значения,
// чтобы витрина и тестер получили структуру ответа без реальных ключей.
function fallbackTariffs(): TariffRow[] {
  return [
    {
      tariff_code: 136,
      tariff_name: "Посылка склад-склад",
      delivery_sum: 450,
      period_min: 3,
      period_max: 5,
      mode: "office",
    },
    {
      tariff_code: 137,
      tariff_name: "Посылка склад-дверь",
      delivery_sum: 650,
      period_min: 3,
      period_max: 5,
      mode: "door",
    },
  ];
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`cdek-calc:${ip}`, 20, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов" },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const parsed = parseBody(cdekCalculateSchema, body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (!isCdekConfigured()) {
      return NextResponse.json({
        tariffs: fallbackTariffs(),
        from_city_code: FROM_CITY_CODE,
        mock: true,
      });
    }

    const { to_city_code, packages, tariff_codes } = parsed.data;
    const codes = tariff_codes?.length ? tariff_codes : IM_TARIFF_CODES;

    const results: TariffRow[] = [];

    try {
      const tariffList = await cdekFetch<CdekTariffListResponse>(
        "/calculator/tarifflist",
        {
          method: "POST",
          body: {
            type: 1,
            from_location: { code: FROM_CITY_CODE },
            to_location: { code: to_city_code },
            packages,
          },
        },
      );

      if (tariffList.tariff_codes) {
        for (const t of tariffList.tariff_codes) {
          if (codes.includes(t.tariff_code)) {
            results.push({
              tariff_code: t.tariff_code,
              tariff_name: t.tariff_name,
              delivery_sum: t.delivery_sum,
              period_min: t.period_min,
              period_max: t.period_max,
              mode: t.delivery_mode === 1 ? "door" : "office",
            });
          }
        }
      }
    } catch {
      for (const code of codes) {
        try {
          const res = await cdekFetch<CdekCalculateResponse>(
            "/calculator/tariff",
            {
              method: "POST",
              body: {
                type: 1,
                tariff_code: code,
                from_location: { code: FROM_CITY_CODE },
                to_location: { code: to_city_code },
                packages,
              },
            },
          );
          if (!res.errors?.length) {
            results.push({
              tariff_code: code,
              tariff_name: res.tariff_name || `Тариф ${code}`,
              delivery_sum: res.delivery_sum,
              period_min: res.period_min,
              period_max: res.period_max,
              mode: [136, 138, 234].includes(code) ? "office" : "door",
            });
          }
        } catch {
          // skip unavailable tariff
        }
      }
    }

    results.sort((a, b) => a.delivery_sum - b.delivery_sum);

    return NextResponse.json({
      tariffs: results,
      from_city_code: FROM_CITY_CODE,
    });
  } catch (err) {
    if (err instanceof CdekApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Ошибка расчёта доставки" },
      { status: 500 },
    );
  }
}
