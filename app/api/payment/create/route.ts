import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { parseBody } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createPayment, isCdekPayConfigured } from "@/lib/cdek-pay/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paymentCreateSchema = z.object({
  orderId: z.number().int().positive(),
  email: z.string().email().or(z.literal("")),
  returnUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`payment-create:${ip}`, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов" },
      { status: 429 },
    );
  }

  if (!isCdekPayConfigured()) {
    return NextResponse.json(
      { error: "Сервис оплаты временно недоступен" },
      { status: 503 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Сервис временно недоступен" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(paymentCreateSchema, body);
  if ("error" in parsed) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  const { orderId, email } = parsed.data;

  try {
    const supabase = createAdminClient();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, order_number, total, payment_method, payment_status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Заказ не найден" },
        { status: 404 },
      );
    }

    if (order.payment_method !== "cdek_pay") {
      return NextResponse.json(
        { error: "Заказ не требует онлайн-оплаты" },
        { status: 400 },
      );
    }

    if (order.payment_status !== "pending") {
      return NextResponse.json(
        { error: "Заказ уже оплачен или отменён" },
        { status: 400 },
      );
    }

    const { data: items } = await supabase
      .from("order_items")
      .select("name, price, quantity")
      .eq("order_id", orderId);

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const orderNumber = order.order_number ?? `ORD-${orderId}`;

    const result = await createPayment({
      order_number: orderNumber,
      email: email || "no-reply@2x2hmao.ru",
      amount: order.total,
      goods: (items ?? []).map((i) => ({
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      success_url: `${baseUrl}/checkout/success?order=${orderNumber}`,
      fail_url: `${baseUrl}/checkout?error=payment`,
    });

    await supabase
      .from("orders")
      .update({
        payment_url: result.payment_url,
        payment_order_number: result.order_number,
      })
      .eq("id", orderId);

    return NextResponse.json({
      ok: true,
      payment_url: result.payment_url,
      order_number: result.order_number,
    });
  } catch (err) {
    console.error("[api/payment/create] failed:", err);
    return NextResponse.json(
      { error: "Не удалось создать платёж" },
      { status: 500 },
    );
  }
}
