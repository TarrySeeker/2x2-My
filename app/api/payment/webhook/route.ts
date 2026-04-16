import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { verifyWebhookSignature } from "@/lib/cdek-pay/client";
import { createCdekShipment } from "@/lib/cdek/shipment";
import type { PaymentStatus } from "@/lib/cdek-pay/types";
import type { UpdateRow } from "@/lib/supabase/table-types";

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

  const signature = typeof payload.signature === "string" ? payload.signature : "";
  if (!signature || !verifyWebhookSignature(payload, signature)) {
    console.warn("[payment/webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const orderNumber = typeof payload.order_number === "string"
    ? payload.order_number
    : "";
  const rawStatus = typeof payload.payment_status === "string"
    ? payload.payment_status
    : "";

  if (!orderNumber || !rawStatus) {
    console.warn("[payment/webhook] Missing order_number or status");
    return NextResponse.json({ ok: true });
  }

  const paymentStatus = mapPaymentStatus(rawStatus);

  try {
    const supabase = createAdminClient();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, payment_status, cdek_order_uuid, delivery_type")
      .eq("payment_order_number", orderNumber)
      .single();

    if (orderError || !order) {
      console.warn(`[payment/webhook] Order not found: ${orderNumber}`);
      return NextResponse.json({ ok: true });
    }

    const updateData: UpdateRow<"orders"> = {
      payment_status: paymentStatus,
      ...(paymentStatus === "paid" ? { paid_at: new Date().toISOString() } : {}),
    };

    await supabase.from("orders").update(updateData).eq("id", order.id);

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      status: paymentStatus === "paid" ? ("confirmed" as const) : ("new" as const),
      comment: `Оплата: ${paymentStatus}`,
      changed_by: null,
    });

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
