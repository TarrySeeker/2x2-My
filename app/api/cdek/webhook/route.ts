import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db/client";
import type { CdekWebhookPayload } from "@/lib/cdek";
import type { OrderStatus } from "@/types/database";

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

interface OrderRow {
  id: number;
  status: string;
}

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

    let orders: OrderRow[] = [];
    if (attributes.cdek_number) {
      orders = await sql<OrderRow[]>`
        SELECT id, status FROM orders
        WHERE cdek_order_number = ${attributes.cdek_number}
        LIMIT 1
      `;
    } else if (attributes.number) {
      orders = await sql<OrderRow[]>`
        SELECT id, status FROM orders
        WHERE order_number = ${attributes.number}
        LIMIT 1
      `;
    }

    let order = orders[0];
    if (!order && payload.uuid) {
      const byUuid = await sql<OrderRow[]>`
        SELECT id, status FROM orders
        WHERE cdek_order_uuid = ${payload.uuid}
        LIMIT 1
      `;
      order = byUuid[0];
    }

    if (!order) {
      return NextResponse.json({ ok: true, note: "order not found" });
    }

    await updateOrderStatus(
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
  orderId: number,
  currentStatus: string,
  newStatus: OrderStatus,
  cdekStatusCode: string,
  cdekNumber?: string,
) {
  const finalStatuses = ["completed", "cancelled", "returned"];
  if (finalStatuses.includes(currentStatus)) return;

  if (cdekNumber) {
    await sql`
      UPDATE orders
      SET status = ${newStatus},
          cdek_order_number = ${cdekNumber}
      WHERE id = ${orderId}
    `;
  } else {
    await sql`
      UPDATE orders
      SET status = ${newStatus}
      WHERE id = ${orderId}
    `;
  }

  await sql`
    INSERT INTO order_status_history (order_id, status, comment, changed_by)
    VALUES (
      ${orderId},
      ${newStatus},
      ${`СДЭК статус: ${cdekStatusCode}${cdekNumber ? `, номер: ${cdekNumber}` : ""}`},
      NULL
    )
  `;
}
