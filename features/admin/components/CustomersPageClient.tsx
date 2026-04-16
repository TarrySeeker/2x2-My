"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Users, X, ShoppingCart } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import type { CustomerSummary, CustomerFilters, OrderRow } from "@/features/admin/types";
import {
  fetchCustomersAction,
  fetchCustomerOrdersAction,
} from "@/features/admin/actions/customers";
import AdminTable from "./AdminTable";
import AdminSearch from "./AdminSearch";
import AdminPageHeader from "./AdminPageHeader";
import StatusBadge from "./StatusBadge";

const col = createColumnHelper<CustomerSummary>();

export default function CustomersPageClient() {
  const [data, setData] = useState<CustomerSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Sheet state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [customerOrders, setCustomerOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: CustomerFilters = {
        search: search || undefined,
        page,
        perPage,
      };
      const result = await fetchCustomersAction(filters);
      setData(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Ошибка загрузки клиентов");
    } finally {
      setLoading(false);
    }
  }, [search, page, perPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleOpenSheet(customer: CustomerSummary) {
    setSelectedCustomer(customer);
    setOrdersLoading(true);
    try {
      const orders = await fetchCustomerOrdersAction(customer.customer_phone);
      setCustomerOrders(orders);
    } catch {
      toast.error("Ошибка загрузки заказов");
    } finally {
      setOrdersLoading(false);
    }
  }

  const columns = useMemo(
    () => [
      col.accessor("customer_name", {
        header: "Имя",
        cell: (info) => (
          <span className="font-medium text-brand-dark dark:text-neutral-200">
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor("customer_phone", {
        header: "Телефон",
        size: 160,
        cell: (info) => (
          <a
            href={`tel:${info.getValue()}`}
            className="text-sm text-neutral-600 hover:text-brand-orange dark:text-neutral-400"
          >
            {info.getValue()}
          </a>
        ),
      }),
      col.accessor("customer_email", {
        header: "Email",
        size: 200,
        cell: (info) => (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {info.getValue() ?? "—"}
          </span>
        ),
      }),
      col.accessor("orders_count", {
        header: "Заказов",
        size: 90,
        cell: (info) => (
          <span className="font-semibold text-brand-dark dark:text-white">
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor("total_spent", {
        header: "Сумма",
        size: 130,
        cell: (info) => (
          <span className="font-medium">
            {new Intl.NumberFormat("ru-RU").format(info.getValue())} ₽
          </span>
        ),
      }),
      col.accessor("last_order_date", {
        header: "Последний заказ",
        size: 130,
        cell: (info) => (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {new Date(info.getValue()).toLocaleDateString("ru-RU")}
          </span>
        ),
      }),
    ],
    [],
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
        title="Клиенты"
        description={`${total} клиентов`}
      />

      <AdminSearch
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Поиск по имени, телефону, email..."
        className="sm:w-80"
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
        </div>
      ) : (
        <AdminTable
          table={table}
          emptyMessage="Клиенты не найдены"
          emptyIcon={<Users className="h-8 w-8" />}
          onRowClick={handleOpenSheet}
        />
      )}

      {/* Customer Sheet */}
      <AnimatePresence>
        {selectedCustomer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => setSelectedCustomer(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-xl dark:bg-neutral-900"
            >
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-brand-dark dark:text-white">
                    Карточка клиента
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Customer info */}
                <div className="mb-6 space-y-3 rounded-xl border border-neutral-200 p-4 dark:border-white/10">
                  <p className="text-lg font-semibold text-brand-dark dark:text-white">
                    {selectedCustomer.customer_name}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {selectedCustomer.customer_phone}
                  </p>
                  {selectedCustomer.customer_email && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {selectedCustomer.customer_email}
                    </p>
                  )}
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-neutral-500">Заказов</p>
                      <p className="text-lg font-bold text-brand-orange">
                        {selectedCustomer.orders_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-500">Сумма</p>
                      <p className="text-lg font-bold text-brand-dark dark:text-white">
                        {new Intl.NumberFormat("ru-RU").format(
                          selectedCustomer.total_spent,
                        )}{" "}
                        ₽
                      </p>
                    </div>
                  </div>
                </div>

                {/* Orders */}
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-dark dark:text-white">
                  <ShoppingCart className="h-4 w-4 text-neutral-400" />
                  Заказы
                </h3>
                {ordersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
                  </div>
                ) : customerOrders.length === 0 ? (
                  <p className="text-sm text-neutral-400">Нет заказов</p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((order) => (
                      <a
                        key={order.id}
                        href={`/admin/orders/${order.id}`}
                        className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/5"
                      >
                        <div>
                          <p className="font-mono text-xs font-semibold text-brand-orange">
                            {order.order_number ?? `#${order.id}`}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {new Date(order.created_at).toLocaleDateString("ru-RU")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={order.status} />
                          <span className="text-sm font-semibold text-brand-dark dark:text-white">
                            {new Intl.NumberFormat("ru-RU").format(order.total)} ₽
                          </span>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
