import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { cdekFetch, isCdekConfigured } from "@/lib/cdek";
import type {
  CdekDeliveryPoint,
  CdekCalculateResponse,
  CdekTariffListResponse,
} from "@/lib/cdek/types";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CDEK_FROM_LOCATION_CODE = Number(
  process.env.CDEK_FROM_LOCATION_CODE || "1104",
);

export async function GET(request: NextRequest) {
  return handleProxy(request);
}

export async function POST(request: NextRequest) {
  return handleProxy(request);
}

async function handleProxy(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`cdek-proxy:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
  }

  if (!isCdekConfigured()) {
    return NextResponse.json(
      { error: "CDEK not configured" },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    if (action === "offices" || action === "deliverypoints") {
      return await handleOffices(url);
    }

    if (action === "calculate") {
      return await handleCalculate(request, url);
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 },
    );
  } catch (err) {
    console.error("[cdek/proxy] error:", err);
    return NextResponse.json(
      { error: "CDEK proxy error" },
      { status: 502 },
    );
  }
}

async function handleOffices(url: URL) {
  const cityCode = url.searchParams.get("city_code");
  const type = url.searchParams.get("type");

  const params: Record<string, string | number | undefined> = {};
  if (cityCode) params.city_code = Number(cityCode);
  if (type) params.type = type;

  const data = await cdekFetch<CdekDeliveryPoint[]>("/deliverypoints", {
    params,
  });

  return NextResponse.json(data);
}

async function handleCalculate(request: NextRequest, url: URL) {
  let body: Record<string, unknown> = {};

  if (request.method === "POST") {
    try {
      body = await request.json();
    } catch {
      // fall through to query params
    }
  }

  const toCityCode =
    Number(body.city_code || url.searchParams.get("city_code")) || 44;
  const tariffCode =
    Number(body.tariff_code || url.searchParams.get("tariff_code")) || 0;
  const weight = Number(body.weight || url.searchParams.get("weight")) || 1000;

  const packages = [{ weight, length: 30, width: 20, height: 15 }];

  if (tariffCode > 0) {
    const result = await cdekFetch<CdekCalculateResponse>(
      "/calculator/tariff",
      {
        method: "POST",
        body: {
          type: 1,
          from_location: { code: CDEK_FROM_LOCATION_CODE },
          to_location: { code: toCityCode },
          tariff_code: tariffCode,
          packages,
        },
      },
    );
    return NextResponse.json(result);
  }

  const result = await cdekFetch<CdekTariffListResponse>(
    "/calculator/tarifflist",
    {
      method: "POST",
      body: {
        type: 1,
        from_location: { code: CDEK_FROM_LOCATION_CODE },
        to_location: { code: toCityCode },
        packages,
      },
    },
  );

  return NextResponse.json(result);
}
