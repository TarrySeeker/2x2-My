"use server";

import { getCustomers, getCustomerOrders } from "@/features/admin/api/customers";
import { requireAdmin } from "@/features/auth/api";
import type { CustomerFilters } from "@/features/admin/types";

export async function fetchCustomersAction(filters: CustomerFilters) {
  await requireAdmin();
  return getCustomers(filters);
}

export async function fetchCustomerOrdersAction(phone: string) {
  await requireAdmin();
  return getCustomerOrders(phone);
}
