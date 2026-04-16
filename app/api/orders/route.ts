import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { parseBody } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { orderSchema, type OrderInput } from "@/lib/checkout/order-schema";
import { calculateTotals } from "@/lib/checkout/totals";
import { cdekFetch, isCdekConfigured } from "@/lib/cdek";
import { createCdekShipment } from "@/lib/cdek/shipment";
import type { CdekCalculateResponse } from "@/lib/cdek/types";
import type { InsertRow } from "@/lib/supabase/table-types";
import type { Json, DeliveryAddress } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNullableString(val: string | undefined): string | null {
  return val && val.length > 0 ? val : null;
}

interface PromoResult {
  promoDiscount: number;
  promoCodeId: number | null;
}

async function verifyPromoCode(
  supabase: ReturnType<typeof createAdminClient>,
  code: string | undefined,
  subtotal: number,
): Promise<PromoResult> {
  if (!code || code.trim().length === 0) {
    return { promoDiscount: 0, promoCodeId: null };
  }

  const { data: promo, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code.trim())
    .eq("is_active", true)
    .single();

  if (error || !promo) {
    return { promoDiscount: 0, promoCodeId: null };
  }

  const now = new Date().toISOString();
  if (promo.valid_from && promo.valid_from > now) {
    return { promoDiscount: 0, promoCodeId: null };
  }
  if (promo.valid_to && promo.valid_to < now) {
    return { promoDiscount: 0, promoCodeId: null };
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return { promoDiscount: 0, promoCodeId: null };
  }

  if (promo.min_order_amount !== null && subtotal < promo.min_order_amount) {
    return { promoDiscount: 0, promoCodeId: null };
  }

  let discount = 0;
  if (promo.type === "percent") {
    discount = Math.round((subtotal * promo.value) / 100);
  } else {
    discount = promo.value;
  }

  if (promo.max_discount_amount !== null && discount > promo.max_discount_amount) {
    discount = promo.max_discount_amount;
  }

  discount = Math.min(discount, subtotal);

  return { promoDiscount: discount, promoCodeId: promo.id };
}

async function calculateServerDeliveryCost(
  input: OrderInput,
): Promise<number> {
  if (input.delivery.type === "pickup") return 0;
  if (input.delivery.type === "courier") return 500;

  if (
    input.delivery.type === "cdek" &&
    input.delivery.tariffCode &&
    (input.delivery.pointCode || input.delivery.cityCode) &&
    isCdekConfigured()
  ) {
    try {
      const fromCode = Number(process.env.CDEK_FROM_LOCATION_CODE || "1104");
      const toCityCode = input.delivery.cityCode ?? 44;

      const result = await cdekFetch<CdekCalculateResponse>(
        "/calculator/tariff",
        {
          method: "POST",
          body: {
            type: 1,
            from_location: { code: fromCode },
            to_location: { code: toCityCode },
            tariff_code: input.delivery.tariffCode,
            packages: [{ weight: 1000, length: 30, width: 20, height: 15 }],
          },
        },
      );

      if (result.delivery_sum > 0) {
        return Math.round(result.delivery_sum);
      }
    } catch (err) {
      console.error("[api/orders] CDEK tariff calc failed:", err);
    }
  }

  return 0;
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

  const input = parsed.data as OrderInput;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Сервис временно недоступен" },
      { status: 503 },
    );
  }

  try {
    const supabase = createAdminClient();

    const rawSubtotal = input.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const { promoDiscount, promoCodeId } = await verifyPromoCode(
      supabase,
      input.promoCode,
      rawSubtotal,
    );

    const deliveryCost = await calculateServerDeliveryCost(input);

    const totals = calculateTotals({
      items: input.items,
      deliveryType: input.delivery.type,
      installationRequired: input.installation?.required ?? false,
      promoDiscount,
      deliveryCost,
    });

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
      promo_code_id: promoCodeId,
      promo_code: toNullableString(input.promoCode),
      delivery_type: input.delivery.type,
      delivery_tariff_code: input.delivery.tariffCode ?? null,
      delivery_tariff_name: null,
      delivery_point_code: toNullableString(input.delivery.pointCode),
      delivery_point_address: toNullableString(input.delivery.pointAddress),
      delivery_address: deliveryAddr
        ? ({ street: deliveryAddr } satisfies DeliveryAddress)
        : null,
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

    if (promoCodeId) {
      const { data: currentPromo } = await supabase
        .from("promo_codes")
        .select("used_count")
        .eq("id", promoCodeId)
        .single();
      if (currentPromo) {
        await supabase
          .from("promo_codes")
          .update({ used_count: currentPromo.used_count + 1 })
          .eq("id", promoCodeId);
      }
    }

    const requiresPayment = input.payment.method === "cdek_pay";

    if (!requiresPayment && input.delivery.type !== "pickup") {
      createCdekShipment(orderId).catch((err) => {
        console.error("[api/orders] CDEK shipment creation failed:", err);
        supabase
          .from("order_status_history")
          .insert({
            order_id: orderId,
            status: "new" as const,
            comment: `Ошибка создания СДЭК-заказа: ${err instanceof Error ? err.message : "Unknown"}`,
            changed_by: null,
          })
          .then(() => {});
      });
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.order_number,
      requiresPayment,
    });
  } catch (err) {
    console.error("[api/orders] order creation failed:", err);
    return NextResponse.json(
      { error: "Не удалось создать заказ, попробуйте позже" },
      { status: 500 },
    );
  }
}
