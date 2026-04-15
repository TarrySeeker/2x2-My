import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateProductPrice } from "@/lib/data/catalog";
import { parseBody } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const calcSchema = z.object({
  product_id: z.coerce.number().int().positive(),
  params: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .default({}),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`calc:${ip}`, 60, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { success: false, error: "Слишком много запросов" },
      { status: 429 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = parseBody(calcSchema, raw);
  if ("error" in parsed) {
    return NextResponse.json(
      { success: false, error: parsed.error },
      { status: 400 },
    );
  }

  try {
    const result = await calculateProductPrice({
      productId: parsed.data.product_id,
      params: parsed.data.params ?? {},
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/products/calculate]", err);
    return NextResponse.json(
      { success: false, error: "Ошибка расчёта" },
      { status: 500 },
    );
  }
}
