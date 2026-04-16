import type { OrderStatus } from "@/types/database";

/**
 * Valid order status transitions.
 * Shared between server API, client UI, and tests.
 * DO NOT add "server-only" — this file is imported by client components.
 */
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["ready", "cancelled"],
  ready: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["completed", "returned"],
  completed: [],
  cancelled: [],
  returned: [],
};
