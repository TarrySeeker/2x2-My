"use server";

import type {
  CustomerFilters,
  CustomerSummary,
  OrderRow,
} from "@/features/admin/types";

/**
 * Заглушки. См. features/admin/api/customers.ts.
 */

export async function fetchCustomersAction(
  _filters: CustomerFilters,
): Promise<{ data: CustomerSummary[]; total: number }> {
  return { data: [], total: 0 };
}

export async function fetchCustomerOrdersAction(
  _phone: string,
): Promise<OrderRow[]> {
  return [];
}
