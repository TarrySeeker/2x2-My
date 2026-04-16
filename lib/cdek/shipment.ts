import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { cdekFetch, isCdekConfigured } from "./client";
import type { CdekOrderRequest, CdekOrderResponse } from "./types";
import type { DeliveryAddress } from "@/types/database";

const CDEK_FROM_LOCATION_CODE = Number(
  process.env.CDEK_FROM_LOCATION_CODE || "1104",
);
const CDEK_FROM_ADDRESS = process.env.CDEK_FROM_ADDRESS || "ул. Парковая 92 Б";

export interface ShipmentResult {
  success: boolean;
  cdek_order_uuid?: string;
  cdek_order_number?: string;
  error?: string;
}

export async function createCdekShipment(
  orderId: number,
): Promise<ShipmentResult> {
  if (!isCdekConfigured()) {
    return { success: false, error: "CDEK not configured" };
  }

  const supabase = createAdminClient();

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { success: false, error: `Order not found: ${orderId}` };
  }

  if (order.delivery_type === "pickup") {
    return { success: true };
  }

  if (order.cdek_order_uuid) {
    return {
      success: true,
      cdek_order_uuid: order.cdek_order_uuid,
      cdek_order_number: order.cdek_order_number ?? undefined,
    };
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (itemsError || !items) {
    return { success: false, error: "Order items not found" };
  }

  const tariffCode = order.delivery_tariff_code ?? 136;
  const isOffice = [136, 234].includes(tariffCode);
  const addr = order.delivery_address as DeliveryAddress | null;
  const toCityCode = addr?.city_code ?? 44;

  const cdekBody: CdekOrderRequest = {
    type: 1,
    number: order.order_number ?? `ORD-${orderId}`,
    tariff_code: tariffCode,
    sender: {
      name: "Рекламная компания 2х2",
      phones: [{ number: "+79324247740" }],
    },
    recipient: {
      name: order.customer_name,
      phones: [{ number: order.customer_phone }],
      email: order.customer_email ?? undefined,
    },
    packages: [
      {
        number: `PKG-${orderId}`,
        weight: 1000,
        length: 30,
        width: 20,
        height: 15,
        items: items.map((item) => ({
          name: item.name,
          ware_key: item.sku ?? `ITEM-${item.id}`,
          payment: { value: 0 },
          cost: item.price,
          amount: item.quantity,
          weight: 1000,
        })),
      },
    ],
  };

  if (isOffice && order.delivery_point_code) {
    cdekBody.delivery_point = order.delivery_point_code;
    cdekBody.from_location = {
      code: CDEK_FROM_LOCATION_CODE,
      address: CDEK_FROM_ADDRESS,
    };
  } else {
    const deliveryStreet =
      addr?.street ?? order.delivery_point_address ?? "";

    cdekBody.from_location = {
      code: CDEK_FROM_LOCATION_CODE,
      address: CDEK_FROM_ADDRESS,
    };
    cdekBody.to_location = {
      code: toCityCode,
      address: deliveryStreet,
    };
  }

  try {
    const result = await cdekFetch<CdekOrderResponse>("/orders", {
      method: "POST",
      body: cdekBody,
    });

    const uuid = result.entity?.uuid;
    if (!uuid) {
      const errMsg =
        result.requests?.[0]?.errors?.[0]?.message ?? "No UUID in response";
      return { success: false, error: errMsg };
    }

    await supabase
      .from("orders")
      .update({
        cdek_order_uuid: uuid,
        cdek_tracking_url: `https://cdek.ru/track?order_id=${uuid}`,
      })
      .eq("id", orderId);

    return {
      success: true,
      cdek_order_uuid: uuid,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown CDEK error";
    console.error(`[cdek/shipment] Failed for order ${orderId}:`, msg);
    return { success: false, error: msg };
  }
}
