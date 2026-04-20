import "server-only";

import { sql } from "@/lib/db/client";
import type { OrderStatus } from "@/types/database";
import type {
  AdminOrderFilters,
  OrderRow,
  OrderFull,
  OrderItemWithProduct,
} from "@/features/admin/types";
import type { Row } from "@/lib/db/table-types";
import { VALID_TRANSITIONS } from "@/features/admin/constants/order-workflow";

type OrderItemRow = Row<"order_items">;
type OrderStatusHistoryRow = Row<"order_status_history">;

export { VALID_TRANSITIONS };

// ── List with filters ──

export async function getAdminOrders(
  filters: AdminOrderFilters,
): Promise<{ data: OrderRow[]; total: number }> {
  try {
    const {
      page,
      perPage,
      search,
      status,
      type,
      date_from,
      date_to,
      payment_status,
    } = filters;
    const offset = (page - 1) * perPage;
    const like = search ? `%${search}%` : null;
    const statusArg = (status ?? null) as string | null;
    const typeArg = (type ?? null) as string | null;
    const paymentArg = (payment_status ?? null) as string | null;
    const dateFromArg = (date_from ?? null) as string | null;
    const dateToArg = (date_to ?? null) as string | null;

    const totalRows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM orders
      WHERE (${statusArg}::text IS NULL OR status::text = ${statusArg})
        AND (${typeArg}::text IS NULL OR type::text = ${typeArg})
        AND (${paymentArg}::text IS NULL OR payment_status = ${paymentArg})
        AND (${dateFromArg}::text IS NULL OR created_at >= ${dateFromArg})
        AND (${dateToArg}::text IS NULL OR created_at <= ${dateToArg})
        AND (
          ${like}::text IS NULL
          OR order_number ILIKE ${like}
          OR customer_name ILIKE ${like}
          OR customer_phone ILIKE ${like}
        )
    `;
    const total = totalRows[0]?.count ?? 0;

    const orders = await sql<OrderRow[]>`
      SELECT *
      FROM orders
      WHERE (${statusArg}::text IS NULL OR status::text = ${statusArg})
        AND (${typeArg}::text IS NULL OR type::text = ${typeArg})
        AND (${paymentArg}::text IS NULL OR payment_status = ${paymentArg})
        AND (${dateFromArg}::text IS NULL OR created_at >= ${dateFromArg})
        AND (${dateToArg}::text IS NULL OR created_at <= ${dateToArg})
        AND (
          ${like}::text IS NULL
          OR order_number ILIKE ${like}
          OR customer_name ILIKE ${like}
          OR customer_phone ILIKE ${like}
        )
      ORDER BY created_at DESC
      LIMIT ${perPage}
      OFFSET ${offset}
    `;

    return { data: orders, total };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getAdminOrders] DB request failed:", err);
    }
    return { data: [], total: 0 };
  }
}

// ── Get single order ──

export async function getOrderById(id: number): Promise<OrderFull | null> {
  try {
    const orderRows = await sql<OrderRow[]>`
      SELECT * FROM orders WHERE id = ${id} LIMIT 1
    `;
    const order = orderRows[0];
    if (!order) return null;

    const [items, history] = await Promise.all([
      sql<OrderItemRow[]>`
        SELECT *
        FROM order_items
        WHERE order_id = ${id}
        ORDER BY id ASC
      `,
      sql<OrderStatusHistoryRow[]>`
        SELECT *
        FROM order_status_history
        WHERE order_id = ${id}
        ORDER BY created_at DESC
      `,
    ]);

    const productIds = items
      .map((i: OrderItemRow) => i.product_id)
      .filter((id: number | null): id is number => id !== null);
    const productMap = new Map<
      number,
      { name: string; image_url: string | null }
    >();

    if (productIds.length > 0) {
      const products = await sql<{ id: number; name: string }[]>`
        SELECT id, name
        FROM products
        WHERE id IN ${sql(productIds)}
      `;
      const images = await sql<{ product_id: number; url: string }[]>`
        SELECT product_id, url
        FROM product_images
        WHERE product_id IN ${sql(productIds)}
          AND is_primary = true
      `;

      const imageMap = new Map<number, string>();
      for (const img of images) imageMap.set(img.product_id, img.url);

      for (const p of products) {
        productMap.set(p.id, {
          name: p.name,
          image_url: imageMap.get(p.id) ?? null,
        });
      }
    }

    const enrichedItems: OrderItemWithProduct[] = items.map((item: OrderItemRow) => {
      const product = item.product_id ? productMap.get(item.product_id) : null;
      return {
        ...item,
        product_name: product?.name ?? item.name,
        product_image: product?.image_url ?? item.image_url,
      };
    });

    // Assigned user (users table, was profiles)
    let assigned_profile: OrderFull["assigned_profile"] = null;
    if (order.assigned_to) {
      const userRows = await sql<
        { id: string; full_name: string | null; email: string }[]
      >`
        SELECT id, full_name, email
        FROM users
        WHERE id = ${order.assigned_to}
        LIMIT 1
      `;
      assigned_profile = userRows[0] ?? null;
    }

    return {
      ...order,
      items: enrichedItems,
      status_history: history,
      assigned_profile,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[getOrderById] DB request failed:", err);
    }
    return null;
  }
}

// ── Update status with workflow check ──

export async function updateOrderStatus(
  orderId: number,
  newStatus: OrderStatus,
  comment: string | null,
  changedBy: string,
): Promise<void> {
  const currentRows = await sql<{ status: OrderStatus }[]>`
    SELECT status FROM orders WHERE id = ${orderId} LIMIT 1
  `;
  const currentStatus: OrderStatus | undefined = currentRows[0]?.status;
  if (!currentStatus) {
    throw new Error("Заказ не найден");
  }

  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Невозможно сменить статус с «${currentStatus}» на «${newStatus}»`,
    );
  }

  // Optimistic locking: обновляем только если статус не менялся
  const updated = await sql<{ id: number }[]>`
    UPDATE orders
    SET status = ${newStatus},
        updated_at = NOW()
    WHERE id = ${orderId}
      AND status = ${currentStatus}
    RETURNING id
  `;

  if (updated.length === 0) {
    throw new Error(
      "Статус заказа был изменён другим пользователем. Обновите страницу.",
    );
  }

  try {
    await sql`
      INSERT INTO order_status_history (order_id, status, comment, changed_by)
      VALUES (${orderId}, ${newStatus}, ${comment ?? null}, ${changedBy})
    `;
  } catch (err) {
    console.error("[orders] Failed to write status history:", err);
  }
}

// ── Assign order to manager ──

export async function assignOrder(
  orderId: number,
  profileId: string,
): Promise<void> {
  await sql`
    UPDATE orders
    SET assigned_to = ${profileId},
        updated_at = NOW()
    WHERE id = ${orderId}
  `;
}

// ── Manager comment ──

export async function addManagerComment(
  orderId: number,
  comment: string,
): Promise<void> {
  await sql`
    UPDATE orders
    SET manager_comment = ${comment},
        updated_at = NOW()
    WHERE id = ${orderId}
  `;
}

// ── Count new orders (for sidebar badge) ──

export async function getNewOrdersCount(): Promise<number> {
  try {
    const rows = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM orders
      WHERE status = 'new'
    `;
    return rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
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
  const { search, status, type, date_from, date_to } = filters;
  const like = search ? `%${search}%` : null;
  const statusArg = (status ?? null) as string | null;
  const typeArg = (type ?? null) as string | null;
  const dateFromArg = (date_from ?? null) as string | null;
  const dateToArg = (date_to ?? null) as string | null;

  const orders = await sql<OrderRow[]>`
    SELECT *
    FROM orders
    WHERE (${statusArg}::text IS NULL OR status::text = ${statusArg})
      AND (${typeArg}::text IS NULL OR type::text = ${typeArg})
      AND (${dateFromArg}::text IS NULL OR created_at >= ${dateFromArg})
      AND (${dateToArg}::text IS NULL OR created_at <= ${dateToArg})
      AND (
        ${like}::text IS NULL
        OR order_number ILIKE ${like}
        OR customer_name ILIKE ${like}
        OR customer_phone ILIKE ${like}
      )
    ORDER BY created_at DESC
  `;

  if (orders.length === 0) {
    return "Номер,Тип,Клиент,Телефон,Email,Статус,Оплата,Сумма,Доставка,Дата\n";
  }

  const header =
    "Номер,Тип,Клиент,Телефон,Email,Статус,Оплата,Сумма,Доставка,Дата";
  const rows = orders.map((o: OrderRow) => {
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
