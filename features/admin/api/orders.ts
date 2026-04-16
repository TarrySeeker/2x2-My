import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import type { OrderStatus } from "@/types/database";
import type {
  AdminOrderFilters,
  OrderRow,
  OrderFull,
  OrderItemWithProduct,
} from "@/features/admin/types";

// ── Workflow transitions ──

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
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

export { VALID_TRANSITIONS };

// ── List with filters ──

export async function getAdminOrders(
  filters: AdminOrderFilters,
): Promise<{ data: OrderRow[]; total: number }> {
  if (!isSupabaseConfigured()) return { data: [], total: 0 };

  const supabase = createAdminClient();
  const { page, perPage, search, status, type, date_from, date_to, payment_status } = filters;

  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (status) {
    query = query.eq("status", status);
  }
  if (type) {
    query = query.eq("type", type);
  }
  if (payment_status) {
    query = query.eq("payment_status", payment_status);
  }
  if (date_from) {
    query = query.gte("created_at", date_from);
  }
  if (date_to) {
    query = query.lte("created_at", date_to);
  }
  if (search) {
    query = query.or(
      `order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`,
    );
  }

  const { data, count } = await query;

  return { data: data ?? [], total: count ?? 0 };
}

// ── Get single order ──

export async function getOrderById(id: number): Promise<OrderFull | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminClient();

  const [orderRes, itemsRes, historyRes] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).single(),
    supabase
      .from("order_items")
      .select("*")
      .eq("order_id", id)
      .order("id", { ascending: true }),
    supabase
      .from("order_status_history")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!orderRes.data) return null;

  const order = orderRes.data;
  const items = itemsRes.data ?? [];

  // Enrich items with product name/image
  const productIds = items.map((i) => i.product_id).filter(Boolean) as number[];
  const productMap = new Map<number, { name: string; image_url: string | null }>();

  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds);

    const { data: images } = await supabase
      .from("product_images")
      .select("product_id, url")
      .in("product_id", productIds)
      .eq("is_primary", true);

    const imageMap = new Map<number, string>();
    for (const img of images ?? []) {
      imageMap.set(img.product_id, img.url);
    }

    for (const p of products ?? []) {
      productMap.set(p.id, {
        name: p.name,
        image_url: imageMap.get(p.id) ?? null,
      });
    }
  }

  const enrichedItems: OrderItemWithProduct[] = items.map((item) => {
    const product = item.product_id ? productMap.get(item.product_id) : null;
    return {
      ...item,
      product_name: product?.name ?? item.name,
      product_image: product?.image_url ?? item.image_url,
    };
  });

  // Get assigned profile
  let assigned_profile: OrderFull["assigned_profile"] = null;
  if (order.assigned_to) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", order.assigned_to)
      .single();
    assigned_profile = profile;
  }

  return {
    ...order,
    items: enrichedItems,
    status_history: historyRes.data ?? [],
    assigned_profile,
  };
}

// ── Update status with workflow check ──

export async function updateOrderStatus(
  orderId: number,
  newStatus: OrderStatus,
  comment: string | null,
  changedBy: string,
): Promise<void> {
  const supabase = createAdminClient();

  // Get current status
  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    throw new Error("Заказ не найден");
  }

  const currentStatus = order.status as OrderStatus;
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Невозможно сменить статус с «${currentStatus}» на «${newStatus}»`,
    );
  }

  // Update order status
  const { error: updateError } = await supabase
    .from("orders")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // Record in status history
  const { error: historyError } = await supabase
    .from("order_status_history")
    .insert({
      order_id: orderId,
      status: newStatus,
      comment: comment ?? null,
      changed_by: changedBy,
    });

  if (historyError) {
    console.error("[orders] Failed to write status history:", historyError.message);
  }
}

// ── Assign order to manager ──

export async function assignOrder(
  orderId: number,
  profileId: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("orders")
    .update({ assigned_to: profileId, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

// ── Manager comment ──

export async function addManagerComment(
  orderId: number,
  comment: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("orders")
    .update({ manager_comment: comment, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) throw new Error(error.message);
}

// ── Count new orders (for sidebar badge) ──

export async function getNewOrdersCount(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = createAdminClient();

  const { count } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");

  return count ?? 0;
}

// ── CSV export ──

/** Escape a CSV cell to prevent formula injection (=, +, -, @, \t, \r) */
function escapeCsvCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}`;
  }
  if (value.includes('"') || value.includes(",") || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  in_production: "В производстве",
  ready: "Готов",
  shipped: "Отправлен",
  delivered: "Доставлен",
  completed: "Завершён",
  cancelled: "Отменён",
  returned: "Возврат",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "Ожидает",
  paid: "Оплачен",
  failed: "Ошибка",
  refunded: "Возврат",
};

export async function exportOrdersCSV(
  filters: AdminOrderFilters,
): Promise<string> {
  const supabase = createAdminClient();

  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.date_from) query = query.gte("created_at", filters.date_from);
  if (filters.date_to) query = query.lte("created_at", filters.date_to);
  if (filters.search) {
    query = query.or(
      `order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%,customer_phone.ilike.%${filters.search}%`,
    );
  }

  const { data: orders } = await query;

  if (!orders || orders.length === 0) {
    return "Номер,Тип,Клиент,Телефон,Email,Статус,Оплата,Сумма,Доставка,Дата\n";
  }

  const header = "Номер,Тип,Клиент,Телефон,Email,Статус,Оплата,Сумма,Доставка,Дата";
  const rows = orders.map((o) => {
    const cells = [
      o.order_number ?? `#${o.id}`,
      o.type === "one_click" ? "Быстрый" : "Корзина",
      o.customer_name,
      o.customer_phone,
      o.customer_email ?? "",
      STATUS_LABELS[o.status] ?? o.status,
      PAYMENT_LABELS[o.payment_status] ?? o.payment_status,
      o.total.toString(),
      o.delivery_type ?? "Не указано",
      new Date(o.created_at).toLocaleDateString("ru-RU"),
    ];
    return cells.map(escapeCsvCell).join(",");
  });

  return [header, ...rows].join("\n");
}
