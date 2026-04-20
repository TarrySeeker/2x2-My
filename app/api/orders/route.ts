import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { sql, type Tx } from "@/lib/db/client";
import { parseBody } from "@/lib/validation";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { orderSchema, type OrderInput } from "@/lib/checkout/order-schema";
import { calculateTotals } from "@/lib/checkout/totals";
import { cdekFetch, isCdekConfigured } from "@/lib/cdek";
import { createCdekShipment } from "@/lib/cdek/shipment";
import type { CdekCalculateResponse } from "@/lib/cdek/types";
import type { Row } from "@/lib/db/table-types";
import type { Json, DeliveryAddress } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PromoCodeRow = Row<"promo_codes">;

function toNullableString(val: string | undefined): string | null {
  return val && val.length > 0 ? val : null;
}

interface PromoResult {
  promoDiscount: number;
  promoCodeId: number | null;
}

async function verifyPromoCode(
  code: string | undefined,
  subtotal: number,
): Promise<PromoResult> {
  if (!code || code.trim().length === 0) {
    return { promoDiscount: 0, promoCodeId: null };
  }

  const rows = await sql<PromoCodeRow[]>`
    SELECT *
    FROM promo_codes
    WHERE code = ${code.trim()}
      AND is_active = true
    LIMIT 1
  `;
  const promo = rows[0];
  if (!promo) return { promoDiscount: 0, promoCodeId: null };

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

  if (
    promo.max_discount_amount !== null &&
    discount > promo.max_discount_amount
  ) {
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

  try {
    const rawSubtotal = input.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const { promoDiscount, promoCodeId } = await verifyPromoCode(
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
    const deliveryAddressJson: DeliveryAddress | null = deliveryAddr
      ? ({ street: deliveryAddr } satisfies DeliveryAddress)
      : null;

    const orderResult = await sql.begin(async (tx: Tx) => {
      const orderRows = await tx<{ id: number; order_number: string | null }[]>`
        INSERT INTO orders (
          type, status, customer_id,
          customer_name, customer_email, customer_phone,
          is_b2b, company_name, company_inn, company_kpp, company_address,
          subtotal, delivery_cost, installation_cost, discount_amount, total,
          promo_code_id, promo_code,
          delivery_type, delivery_tariff_code, delivery_tariff_name,
          delivery_point_code, delivery_point_address, delivery_address,
          delivery_period_min, delivery_period_max,
          cdek_order_uuid, cdek_order_number, cdek_tracking_url,
          installation_required, installation_address, installation_date, installation_notes,
          payment_method, payment_status, payment_order_number, payment_url, paid_at,
          manager_comment, customer_comment, assigned_to,
          source, utm_source, utm_medium, utm_campaign
        )
        VALUES (
          'cart', 'new', NULL,
          ${input.customer.name},
          ${toNullableString(input.customer.email)},
          ${input.customer.phone},
          ${input.customer.isB2B},
          ${toNullableString(input.customer.company?.name)},
          ${toNullableString(input.customer.company?.inn)},
          ${toNullableString(input.customer.company?.kpp)},
          ${toNullableString(input.customer.company?.address)},
          ${totals.subtotal},
          ${totals.deliveryCost},
          ${totals.installationCost},
          ${totals.discountAmount},
          ${totals.total},
          ${promoCodeId},
          ${toNullableString(input.promoCode)},
          ${input.delivery.type},
          ${input.delivery.tariffCode ?? null},
          NULL,
          ${toNullableString(input.delivery.pointCode)},
          ${toNullableString(input.delivery.pointAddress)},
          ${tx.json(deliveryAddressJson as unknown as Parameters<typeof tx.json>[0])},
          NULL, NULL,
          NULL, NULL, NULL,
          ${input.installation?.required ?? false},
          ${toNullableString(input.installation?.address)},
          ${toNullableString(input.installation?.date)},
          ${toNullableString(input.installation?.notes)},
          ${input.payment.method},
          'pending',
          NULL, NULL, NULL,
          NULL,
          ${toNullableString(input.customerComment)},
          NULL,
          'web',
          ${toNullableString(input.utm?.source)},
          ${toNullableString(input.utm?.medium)},
          ${toNullableString(input.utm?.campaign)}
        )
        RETURNING id, order_number
      `;

      const order = orderRows[0];
      if (!order) throw new Error("INSERT orders returned no row");

      // Items
      for (const item of input.items) {
        await tx`
          INSERT INTO order_items (
            order_id, product_id, variant_id, name, sku,
            price, quantity, total, image_url, attributes, calc_params
          )
          VALUES (
            ${order.id},
            ${item.productId},
            ${item.variantId ?? null},
            ${item.name},
            ${item.sku ?? null},
            ${item.price},
            ${item.quantity},
            ${item.price * item.quantity},
            ${item.imageUrl ?? null},
            ${tx.json((item.attributes ?? {}) as unknown as Parameters<typeof tx.json>[0])},
            NULL
          )
        `;
      }

      // Status history
      await tx`
        INSERT INTO order_status_history (order_id, status, comment, changed_by)
        VALUES (${order.id}, 'new', 'Создано через сайт', NULL)
      `;

      if (promoCodeId) {
        await tx`
          UPDATE promo_codes
          SET used_count = used_count + 1
          WHERE id = ${promoCodeId}
        `;
      }

      return order;
    });

    const requiresPayment = input.payment.method === "cdek_pay";

    if (!requiresPayment && input.delivery.type !== "pickup") {
      createCdekShipment(orderResult.id).catch((err) => {
        console.error("[api/orders] CDEK shipment creation failed:", err);
        sql`
          INSERT INTO order_status_history (order_id, status, comment, changed_by)
          VALUES (
            ${orderResult.id},
            'new',
            ${`Ошибка создания СДЭК-заказа: ${err instanceof Error ? err.message : "Unknown"}`},
            NULL
          )
        `.catch(() => {});
      });
    }

    return NextResponse.json({
      ok: true,
      orderId: orderResult.id,
      orderNumber: orderResult.order_number,
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
