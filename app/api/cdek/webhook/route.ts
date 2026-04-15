import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { CdekWebhookPayload } from "@/lib/cdek";
import type { OrderStatus } from "@/types/database";
import type { InsertRow, UpdateRow } from "@/lib/supabase/table-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CDEK_ALLOWED_IPS = (process.env.CDEK_WEBHOOK_ALLOWED_IPS ?? "")
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

const CDEK_TO_ORDER_STATUS: Record<string, OrderStatus> = {
  "3": "confirmed",
  "6": "shipped",
  "7": "shipped",
  "13": "shipped",
  "16": "shipped",
  "18": "delivered",
  "20": "cancelled",
};

export async function POST(request: NextRequest) {
  if (CDEK_ALLOWED_IPS.length > 0) {
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const clientIp = forwarded?.split(",")[0]?.trim() || realIp || "";
    if (!CDEK_ALLOWED_IPS.includes(clientIp)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const payload = (await request.json()) as CdekWebhookPayload;

    if (payload.type !== "ORDER_STATUS") {
      return NextResponse.json({ ok: true });
    }

    const { attributes } = payload;
    if (!attributes?.number && !attributes?.cdek_number) {
      return NextResponse.json({ ok: true });
    }

    const statusCode = attributes.status_code;
    if (!statusCode) {
      return NextResponse.json({ ok: true });
    }

    const newStatus = CDEK_TO_ORDER_STATUS[statusCode];
    if (!newStatus) {
      return NextResponse.json({ ok: true });
    }

    if (!isSupabaseConfigured()) {
      // На Этапе 1 БД ещё не подключена — просто логируем и отвечаем ок.
      console.log(
        "[cdek/webhook] demo-mode, skip DB update",
        payload.uuid,
        statusCode,
        newStatus,
      );
      return NextResponse.json({ ok: true, demo: true });
    }

    const supabase = createAdminClient();

    let query = supabase.from("orders").select("id, status").limit(1);
    if (attributes.cdek_number) {
      query = query.eq("cdek_order_number", attributes.cdek_number);
    } else if (attributes.number) {
      query = query.eq("order_number", attributes.number);
    }

    const { data: orders } = await query;
    const order = orders?.[0] as
      | { id: number; status: string }
      | undefined;

    if (!order) {
      const { data: ordersUuid } = await supabase
        .from("orders")
        .select("id, status")
        .eq("cdek_order_uuid", payload.uuid)
        .limit(1);
      const orderUuid = ordersUuid?.[0] as
        | { id: number; status: string }
        | undefined;
      if (!orderUuid) {
        return NextResponse.json({ ok: true, note: "order not found" });
      }
      await updateOrderStatus(
        supabase,
        orderUuid.id,
        orderUuid.status,
        newStatus,
        statusCode,
        attributes.cdek_number,
      );
      return NextResponse.json({ ok: true });
    }

    await updateOrderStatus(
      supabase,
      order.id,
      order.status,
      newStatus,
      statusCode,
      attributes.cdek_number,
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cdek/webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

async function updateOrderStatus(
  supabase: ReturnType<typeof createAdminClient>,
  orderId: number,
  currentStatus: string,
  newStatus: OrderStatus,
  cdekStatusCode: string,
  cdekNumber?: string,
) {
  const finalStatuses = ["completed", "cancelled", "returned"];
  if (finalStatuses.includes(currentStatus)) return;

  const updates: Record<string, unknown> = { status: newStatus };
  if (cdekNumber) updates.cdek_order_number = cdekNumber;

  await supabase
    .from("orders")
    .update(updates as UpdateRow<"orders">)
    .eq("id", orderId);

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    status: newStatus,
    comment: `СДЭК статус: ${cdekStatusCode}${
      cdekNumber ? `, номер: ${cdekNumber}` : ""
    }`,
    changed_by: null,
  } as unknown as InsertRow<"order_status_history">);
}
