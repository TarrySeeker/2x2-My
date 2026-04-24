import type { OrderRow } from "@/features/admin/types";
import StatusBadge from "./StatusBadge";
import clsx from "clsx";

interface LatestOrdersTableProps {
  orders: OrderRow[];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRub(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function LatestOrdersTable({ orders }: LatestOrdersTableProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border",
        "bg-white/80 border-black/5 backdrop-blur-xl",
        "dark:bg-white/[0.04] dark:border-white/10",
      )}
    >
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-brand-dark dark:text-white">
          Последние заказы
        </h3>
      </div>

      {orders.length === 0 ? (
        <div className="px-6 pb-6 text-sm text-neutral-400">
          Заказов пока нет
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-neutral-100 dark:border-white/5">
                <th className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  №
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Клиент
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Сумма
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Статус
                </th>
                <th className="px-6 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500">
                  Дата
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-neutral-100 dark:border-white/5"
                >
                  <td className="px-6 py-3 font-mono text-xs text-neutral-500 dark:text-neutral-400">
                    #{order.order_number ?? order.id}
                  </td>
                  <td className="px-6 py-3 text-brand-dark dark:text-neutral-200">
                    {order.customer_name ?? "—"}
                  </td>
                  <td className="px-6 py-3 font-medium text-brand-dark dark:text-white">
                    {formatRub(order.total)}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-3 text-neutral-500 dark:text-neutral-400">
                    {formatDate(order.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
