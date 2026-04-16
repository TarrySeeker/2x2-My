import clsx from "clsx";

type StatusType =
  | "new"
  | "confirmed"
  | "in_production"
  | "ready"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled"
  | "returned"
  | "active"
  | "draft"
  | "archived"
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "unpaid";

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  new: { label: "Новый", className: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" },
  confirmed: { label: "Подтверждён", className: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400" },
  in_production: { label: "В производстве", className: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" },
  ready: { label: "Готов", className: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400" },
  shipped: { label: "Отправлен", className: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400" },
  delivered: { label: "Доставлен", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  completed: { label: "Завершён", className: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  cancelled: { label: "Отменён", className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
  returned: { label: "Возврат", className: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400" },
  active: { label: "Активен", className: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  draft: { label: "Черновик", className: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400" },
  archived: { label: "Архив", className: "bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-500" },
  pending: { label: "На модерации", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400" },
  approved: { label: "Одобрен", className: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400" },
  rejected: { label: "Отклонён", className: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" },
  paid: { label: "Оплачен", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" },
  unpaid: { label: "Не оплачен", className: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
  };

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
