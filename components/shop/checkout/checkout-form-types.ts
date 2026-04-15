import type { z } from "zod";
import type { orderSchema } from "@/lib/checkout/order-schema";

export type CheckoutFormValues = z.input<typeof orderSchema>;
