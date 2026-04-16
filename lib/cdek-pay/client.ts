import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { CreatePaymentInput, CreatePaymentResponse } from "./types";

const CDEK_PAY_BASE_URL =
  process.env.CDEK_PAY_BASE_URL || "https://secure.cdekfin.ru";
const CDEK_PAY_MODE = process.env.CDEK_PAY_MODE || "test";
const CDEK_PAY_SHOP_LOGIN = process.env.CDEK_PAY_SHOP_LOGIN || "";
const CDEK_PAY_SECRET_KEY = process.env.CDEK_PAY_SECRET_KEY || "";

export function isCdekPayConfigured(): boolean {
  return Boolean(CDEK_PAY_SHOP_LOGIN && CDEK_PAY_SECRET_KEY);
}

export function generateSignature(
  params: Record<string, string | number>,
  secretKey: string,
): string {
  const sortedKeys = Object.keys(params).sort();
  const values = sortedKeys.map((k) => String(params[k]));
  const str = values.join("") + secretKey;
  return createHash("sha256").update(str, "utf8").digest("hex");
}

export async function createPayment(
  input: CreatePaymentInput,
): Promise<CreatePaymentResponse> {
  const apiPath =
    CDEK_PAY_MODE === "prod"
      ? "/merchant_api/payment_orders"
      : "/test_merchant_api/payment_orders";

  const params: Record<string, string | number> = {
    shop_login: CDEK_PAY_SHOP_LOGIN,
    order_number: input.order_number,
    amount: input.amount,
    email: input.email,
    success_url: input.success_url,
    fail_url: input.fail_url,
  };

  const signature = generateSignature(params, CDEK_PAY_SECRET_KEY);

  const body = {
    ...params,
    signature,
    goods: input.goods.map((g) => ({
      name: g.name,
      price: g.price,
      quantity: g.quantity,
    })),
  };

  const res = await fetch(`${CDEK_PAY_BASE_URL}${apiPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CDEK Pay error ${res.status}: ${text}`);
  }

  const data: CreatePaymentResponse = await res.json();
  return data;
}

export function verifyWebhookSignature(
  body: Record<string, unknown>,
  signature: string,
): boolean {
  if (!CDEK_PAY_SECRET_KEY) return false;

  const params: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === "signature") continue;
    if (typeof value === "string" || typeof value === "number") {
      params[key] = value;
    }
  }

  const expected = generateSignature(params, CDEK_PAY_SECRET_KEY);

  const sigBuf = Buffer.from(signature, "utf8");
  const expectedBuf = Buffer.from(expected, "utf8");

  if (sigBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(sigBuf, expectedBuf);
}
