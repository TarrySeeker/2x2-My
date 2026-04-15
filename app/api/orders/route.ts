import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { parseBody } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { orderSchema, type OrderInput } from "@/lib/checkout/order-schema";
import { calculateTotals } from "@/lib/checkout/totals";
import type { InsertRow } from "@/lib/supabase/table-types";
import type { Json } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNullableString(val: string | undefined): string | null {
  return val && val.length > 0 ? val : null;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const rl = rateLimit(`orders:${ip}`, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Слишком много запросов, попробуйте позже" },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(orderSchema, body);
  if ("error" in parsed) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  // Safe: OrderInput is from the base schema; superRefine only adds
  // cross-field checks without changing the data shape
  const input = parsed.data as OrderInput;

  const totals = calculateTotals({
    items: input.items,
    deliveryType: input.delivery.type,
    installationRequired: input.installation?.required ?? false,
    promoDiscount: input.promoDiscount,
  });

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Сервис временно недоступен" },
      { status: 503 },
    );
  }

  try {
    const supabase = createAdminClient();

    const deliveryAddr = toNullableString(input.delivery.address);

    const orderData: InsertRow<"orders"> = {
      type: "cart",
      status: "new",
      customer_id: null,
      customer_name: input.customer.name,
      customer_email: toNullableString(input.customer.email),
      customer_phone: input.customer.phone,
      is_b2b: input.customer.isB2B,
      company_name: toNullableString(input.customer.company?.name),
      company_inn: toNullableString(input.customer.company?.inn),
      company_kpp: toNullableString(input.customer.company?.kpp),
      company_address: toNullableString(input.customer.company?.address),
      subtotal: totals.subtotal,
      delivery_cost: totals.deliveryCost,
      installation_cost: totals.installationCost,
      discount_amount: totals.discountAmount,
      total: totals.total,
      promo_code_id: null,
      promo_code: toNullableString(input.promoCode),
      delivery_type: input.delivery.type,
      delivery_tariff_code: null,
      delivery_tariff_name: null,
      delivery_point_code: null,
      delivery_point_address: null,
      delivery_address: deliveryAddr ? { street: deliveryAddr } : null,
      delivery_period_min: null,
      delivery_period_max: null,
      cdek_order_uuid: null,
      cdek_order_number: null,
      cdek_tracking_url: null,
      installation_required: input.installation?.required ?? false,
      installation_address: toNullableString(input.installation?.address),
      installation_date: toNullableString(input.installation?.date),
      installation_notes: toNullableString(input.installation?.notes),
      payment_method: input.payment.method,
      payment_status: "pending",
      payment_order_number: null,
      payment_url: null,
      paid_at: null,
      manager_comment: null,
      customer_comment: toNullableString(input.customerComment),
      assigned_to: null,
      source: "web",
      utm_source: toNullableString(input.utm?.source),
      utm_medium: toNullableString(input.utm?.medium),
      utm_campaign: toNullableString(input.utm?.campaign),
    };

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert(orderData)
      .select("id, order_number")
      .single();

    if (orderError) throw orderError;

    const orderId = order.id;

    const orderItems: InsertRow<"order_items">[] = input.items.map((item) => ({
      order_id: orderId,
      product_id: item.productId,
      variant_id: item.variantId ?? null,
      name: item.name,
      sku: item.sku ?? null,
      price: item.price,
      quantity: item.quantity,
      total: item.price * item.quantity,
      image_url: item.imageUrl ?? null,
      attributes: (item.attributes ?? {}) as Json,
      calc_params: null,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) throw itemsError;

    const historyRow: InsertRow<"order_status_history"> = {
      order_id: orderId,
      status: "new",
      comment: "Создано через сайт",
      changed_by: null,
    };

    const { error: historyError } = await supabase
      .from("order_status_history")
      .insert(historyRow);

    if (historyError) throw historyError;

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.order_number,
    });
  } catch (err) {
    console.error("[api/orders] order creation failed:", err);
    return NextResponse.json(
      { error: "Не удалось создать заказ, попробуйте позже" },
      { status: 500 },
    );
  }
}
