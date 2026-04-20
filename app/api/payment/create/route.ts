import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/lib/db/client";
import { parseBody } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { createPayment, isCdekPayConfigured } from "@/lib/cdek-pay/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paymentCreateSchema = z.object({
  orderId: z.number().int().positive(),
  email: z.string().email().or(z.literal("")),
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
    const orderRows = await sql<
      {
        id: number;
        order_number: string | null;
        total: number;
        payment_method: string | null;
        payment_status: string;
      }[]
    >`
      SELECT id, order_number, total, payment_method, payment_status
      FROM orders
      WHERE id = ${orderId}
      LIMIT 1
    `;
    const order = orderRows[0];
    if (!order) {
      return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
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

    interface ItemRow {
      name: string;
      price: number;
      quantity: number;
    }
    const items: ItemRow[] = await sql<ItemRow[]>`
      SELECT name, price, quantity
      FROM order_items
      WHERE order_id = ${orderId}
    `;

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const orderNumber = order.order_number ?? `ORD-${orderId}`;

    const result = await createPayment({
      order_number: orderNumber,
      email: email || "no-reply@2x2hmao.ru",
      amount: Number(order.total),
      goods: items.map((i: ItemRow) => ({
        name: i.name,
        price: Number(i.price),
        quantity: i.quantity,
      })),
      success_url: `${baseUrl}/checkout/success?order=${orderNumber}`,
      fail_url: `${baseUrl}/checkout?error=payment`,
    });

    await sql`
      UPDATE orders
      SET
        payment_url = ${result.payment_url},
        payment_order_number = ${result.order_number}
      WHERE id = ${orderId}
    `;

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
