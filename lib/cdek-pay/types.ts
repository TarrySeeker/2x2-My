export interface CreatePaymentInput {
  order_number: string;
  email: string;
  amount: number;
  goods: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  success_url: string;
  fail_url: string;
}

export interface CreatePaymentResponse {
  order_number: string;
  payment_url: string;
}

export type PaymentStatus = "pending" | "paid" | "failed" | "expired";

export interface WebhookPayload {
  order_number: string;
  payment_status: string;
  amount: number;
  currency: string;
  signature: string;
  [key: string]: unknown;
}
