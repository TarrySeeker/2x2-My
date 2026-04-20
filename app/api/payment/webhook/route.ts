import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import { verifyWebhookSignature } from "@/lib/cdek-pay/client";
import { createCdekShipment } from "@/lib/cdek/shipment";
import type { PaymentStatus } from "@/lib/cdek-pay/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapPaymentStatus(status: string): PaymentStatus {
  switch (status.toLowerCase()) {
    case "paid":
    case "success":
    case "completed":
      return "paid";
    case "failed":
    case "declined":
    case "error":
      return "failed";
    case "expired":
      return "expired";
    default:
      return "pending";
  }
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const signature =
    typeof payload.signature === "string" ? payload.signature : "";
  if (!signature || !verifyWebhookSignature(payload, signature)) {
    console.warn("[payment/webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const orderNumber =
    typeof payload.order_number === "string" ? payload.order_number : "";
  const rawStatus =
    typeof payload.payment_status === "string" ? payload.payment_status : "";

  if (!orderNumber || !rawStatus) {
    console.warn("[payment/webhook] Missing order_number or status");
    return NextResponse.json({ ok: true });
  }

  const paymentStatus = mapPaymentStatus(rawStatus);

  try {
    const orderRows = await sql<
      {
        id: number;
        payment_status: string;
        cdek_order_uuid: string | null;
        delivery_type: string | null;
      }[]
    >`
      SELECT id, payment_status, cdek_order_uuid, delivery_type
      FROM orders
      WHERE payment_order_number = ${orderNumber}
      LIMIT 1
    `;
    const order = orderRows[0];
    if (!order) {
      console.warn(`[payment/webhook] Order not found: ${orderNumber}`);
      return NextResponse.json({ ok: true });
    }

    if (paymentStatus === "paid") {
      await sql`
        UPDATE orders
        SET payment_status = ${paymentStatus},
            paid_at = NOW()
        WHERE id = ${order.id}
      `;
    } else {
      await sql`
        UPDATE orders
        SET payment_status = ${paymentStatus}
        WHERE id = ${order.id}
      `;
    }

    await sql`
      INSERT INTO order_status_history (order_id, status, comment, changed_by)
      VALUES (
        ${order.id},
        ${paymentStatus === "paid" ? "confirmed" : "new"},
        ${`Оплата: ${paymentStatus}`},
        NULL
      )
    `;

    if (
      paymentStatus === "paid" &&
      !order.cdek_order_uuid &&
      order.delivery_type !== "pickup"
    ) {
      createCdekShipment(order.id).catch((err) => {
        console.error(
          `[payment/webhook] CDEK shipment failed for order ${order.id}:`,
          err,
        );
      });
    }
  } catch (err) {
    console.error("[payment/webhook] processing error:", err);
  }

  return NextResponse.json({ ok: true });
}
