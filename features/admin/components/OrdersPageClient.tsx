"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ShoppingCart,
  Download,
  Eye,
  Zap,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { OrderStatus, OrderType } from "@/types/database";
import type { AdminOrderFilters, OrderRow } from "@/features/admin/types";
import {
  exportOrdersAction,
} from "@/features/admin/actions/orders";
import AdminTable from "./AdminTable";
import AdminSearch from "./AdminSearch";
import AdminPageHeader from "./AdminPageHeader";
import StatusBadge from "./StatusBadge";

const col = createColumnHelper<OrderRow>();

const STATUS_TABS: { key: OrderStatus | "all" | "one_click"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "confirmed", label: "Подтверждённые" },
  { key: "in_production", label: "В производстве" },
  { key: "ready", label: "Готовые" },
  { key: "shipped", label: "Отправленные" },
  { key: "delivered", label: "Доставленные" },
  { key: "cancelled", label: "Отменённые" },
  { key: "one_click", label: "Быстрые" },
];

const DELIVERY_LABELS: Record<string, string> = {
  pickup: "Самовывоз",
  cdek_pvz: "СДЭК ПВЗ",
  cdek_courier: "СДЭК Курьер",
  delivery: "Доставка",
  install: "Монтаж",
};

interface OrdersPageClientProps {
  newOrdersCount: number;
  fetchOrders: (filters: AdminOrderFilters) => Promise<{ data: OrderRow[]; total: number }>;
}

export default function OrdersPageClient({
  newOrdersCount,
  fetchOrders,
}: OrdersPageClientProps) {
  const router = useRouter();
  const [data, setData] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus | "all" | "one_click">("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const perPage = 20;

  const buildFilters = useCallback((): AdminOrderFilters => {
    const filters: AdminOrderFilters = { page, perPage };
    if (search) filters.search = search;
    if (dateFrom) filters.date_from = dateFrom;
    if (dateTo) filters.date_to = dateTo;
    if (paymentFilter) filters.payment_status = paymentFilter;

    if (activeTab === "one_click") {
      filters.type = "one_click" as OrderType;
    } else if (activeTab !== "all") {
      filters.status = activeTab;
    }

    return filters;
  }, [activeTab, search, dateFrom, dateTo, paymentFilter, page, perPage]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchOrders(buildFilters());
      setData(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Ошибка загрузки заказов");
    } finally {
      setLoading(false);
    }
  }, [fetchOrders, buildFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleExportCSV() {
    setExporting(true);
    try {
      const csv = await exportOrdersAction(buildFilters());
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV скачан");
    } catch {
      toast.error("Ошибка экспорта");
    } finally {
      setExporting(false);
    }
  }

  const columns = useMemo(
    () => [
      col.accessor("order_number", {
        header: "Номер",
        size: 110,
        cell: (info) => (
          <span className="font-mono text-xs font-semibold text-brand-orange">
            {info.getValue() ?? `#${info.row.original.id}`}
          </span>
        ),
      }),
      col.accessor("type", {
        header: "Тип",
        size: 50,
        cell: (info) =>
          info.getValue() === "one_click" ? (
            <span aria-label="Быстрый заказ"><Zap className="h-4 w-4 text-amber-500" /></span>
          ) : (
            <span aria-label="Корзина"><ShoppingCart className="h-4 w-4 text-neutral-400" /></span>
          ),
      }),
      col.accessor("customer_name", {
        header: "Клиент",
        cell: (info) => (
          <div>
            <p className="font-medium text-brand-dark dark:text-neutral-200">
              {info.getValue()}
            </p>
            <p className="text-xs text-neutral-500">
              {info.row.original.customer_phone}
            </p>
          </div>
        ),
      }),
      col.accessor("status", {
        header: "Статус",
        size: 140,
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      col.accessor("payment_status", {
        header: "Оплата",
        size: 120,
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      col.accessor("total", {
        header: "Сумма",
        size: 120,
        cell: (info) => (
          <span className="font-semibold">
            {new Intl.NumberFormat("ru-RU").format(info.getValue())} ₽
          </span>
        ),
      }),
      col.accessor("delivery_type", {
        header: "Доставка",
        size: 120,
        cell: (info) => (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {DELIVERY_LABELS[info.getValue() ?? ""] ?? info.getValue() ?? "—"}
          </span>
        ),
      }),
      col.accessor("created_at", {
        header: "Дата",
        size: 110,
        cell: (info) => (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {new Date(info.getValue()).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ),
      }),
      col.display({
        id: "actions",
        size: 48,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => router.push(`/admin/orders/${row.original.id}`)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-orange dark:hover:bg-white/10"
            title="Подробнее"
          >
            <Eye className="h-4 w-4" />
          </button>
        ),
      }),
    ],
    [router],
  );

  const pageCount = Math.ceil(total / perPage);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      pagination: { pageIndex: page - 1, pageSize: perPage },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize: perPage })
          : updater;
      setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Заказы"
        description={`${total} заказов`}
        actions={
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Экспорт..." : "CSV"}
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-white/5">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
            }}
            className={clsx(
              "relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab.key
                ? "bg-white text-brand-dark shadow-sm dark:bg-white/10 dark:text-white"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
            )}
          >
            {tab.label}
            {tab.key === "new" && newOrdersCount > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {newOrdersCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Номер, имя или телефон..."
          className="sm:w-64"
        />
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-neutral-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
          />
          <span className="text-neutral-400">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
          />
        </div>
        <select
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
        >
          <option value="">Все оплаты</option>
          <option value="pending">Ожидает</option>
          <option value="paid">Оплачен</option>
          <option value="failed">Ошибка</option>
          <option value="refunded">Возврат</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
        </div>
      ) : (
        <AdminTable
          table={table}
          emptyMessage="Заказы не найдены"
          emptyIcon={<ShoppingCart className="h-8 w-8" />}
          onRowClick={(row) => router.push(`/admin/orders/${row.id}`)}
        />
      )}
    </div>
  );
}
