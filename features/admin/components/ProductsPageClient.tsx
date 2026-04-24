"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  Plus,
  Package,
  MoreHorizontal,
  Copy,
  Archive,
  Trash2,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { ProductWithImage } from "@/features/admin/types";
import type { ProductStatus } from "@/types/database";
import type { Row } from "@/lib/db/table-types";
import {
  fetchProductsAction,
  deleteProductAction,
  duplicateProductAction,
  bulkUpdateStatusAction,
  bulkDeleteAction,
} from "@/features/admin/actions/products";
import { fetchCategoriesFlatAction } from "@/features/admin/actions/categories";
import AdminTable from "./AdminTable";
import AdminSearch from "./AdminSearch";
import AdminPageHeader from "./AdminPageHeader";
import StatusBadge from "./StatusBadge";
import ConfirmDialog from "./ConfirmDialog";

type CategoryFlat = Row<"categories">;

const col = createColumnHelper<ProductWithImage>();

interface ProductsPageClientProps {
  onOpenDialog: (productId?: number) => void;
}

export default function ProductsPageClient({
  onOpenDialog,
}: ProductsPageClientProps) {
  const [data, setData] = useState<ProductWithImage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryFlat[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "">("");
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [page, setPage] = useState(1);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchProductsAction({
        search: search || undefined,
        status: (statusFilter as ProductStatus) || undefined,
        categoryId: categoryFilter ? Number(categoryFilter) : undefined,
        page,
        perPage,
      });
      setData(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Ошибка загрузки товаров");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, categoryFilter, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchCategoriesFlatAction().then(setCategories).catch(() => {});
  }, []);

  async function handleDelete(id: number) {
    try {
      await deleteProductAction(id);
      toast.success("Товар удалён");
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error("Ошибка удаления");
    }
  }

  async function handleDuplicate(id: number) {
    try {
      await duplicateProductAction(id);
      toast.success("Товар дублирован");
      fetchData();
    } catch {
      toast.error("Ошибка дублирования");
    }
  }

  async function handleBulkStatus(status: ProductStatus) {
    const ids = Object.keys(rowSelection).map((idx) => data[Number(idx)].id);
    if (ids.length === 0) return;
    try {
      await bulkUpdateStatusAction(ids, status);
      toast.success(`Статус обновлён для ${ids.length} товаров`);
      setRowSelection({});
      fetchData();
    } catch {
      toast.error("Ошибка обновления");
    }
  }

  async function handleBulkDelete() {
    const ids = Object.keys(rowSelection).map((idx) => data[Number(idx)].id);
    if (ids.length === 0) return;
    try {
      await bulkDeleteAction(ids);
      toast.success(`Удалено ${ids.length} товаров`);
      setRowSelection({});
      setBulkDeleteOpen(false);
      fetchData();
    } catch {
      toast.error("Ошибка удаления");
    }
  }

  const columns = useMemo(
    () => [
      col.display({
        id: "select",
        size: 40,
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="h-4 w-4 rounded border-neutral-300 accent-brand-orange"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            className="h-4 w-4 rounded border-neutral-300 accent-brand-orange"
          />
        ),
      }),
      col.accessor("primary_image_url", {
        header: "",
        size: 56,
        cell: (info) => (
          <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-neutral-100 dark:bg-white/10">
            {info.getValue() ? (
              <Image
                src={info.getValue()!}
                alt=""
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-4 w-4 text-neutral-300" />
              </div>
            )}
          </div>
        ),
      }),
      col.accessor("name", {
        header: "Название",
        cell: (info) => (
          <button
            type="button"
            onClick={() => onOpenDialog(info.row.original.id)}
            className="text-left font-medium text-brand-dark hover:text-brand-orange dark:text-neutral-200 dark:hover:text-brand-orange"
          >
            {info.getValue()}
          </button>
        ),
      }),
      col.accessor("sku", {
        header: "SKU",
        size: 100,
        cell: (info) => (
          <span className="font-mono text-xs text-neutral-500">
            {info.getValue() ?? "—"}
          </span>
        ),
      }),
      col.accessor("category_name", {
        header: "Категория",
        size: 140,
        cell: (info) => info.getValue() ?? "—",
      }),
      col.accessor("price", {
        header: "Цена",
        size: 160,
        cell: (info) => {
          const product = info.row.original;
          const fmt = (n: number) => new Intl.NumberFormat("ru-RU").format(n);
          const hasRange =
            product.price_to != null && product.price_to > product.price;
          const isQuote = product.pricing_mode === "quote";
          return (
            <div className="flex flex-col leading-tight">
              {isQuote ? (
                <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  По запросу
                </span>
              ) : (
                <span className="font-medium tabular-nums">
                  {hasRange
                    ? `${fmt(product.price)} – ${fmt(product.price_to as number)} ₽`
                    : `от ${fmt(product.price)} ₽`}
                </span>
              )}
              {product.old_price && (
                <span className="text-[11px] text-neutral-400 line-through tabular-nums">
                  {fmt(product.old_price)} ₽
                </span>
              )}
            </div>
          );
        },
      }),
      col.accessor("stock", {
        header: "Склад",
        size: 80,
        cell: (info) => (
          <span
            className={clsx(
              "font-medium",
              info.getValue() < 5
                ? "text-red-600 dark:text-red-400"
                : "text-brand-dark dark:text-neutral-200",
            )}
          >
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor("status", {
        header: "Статус",
        size: 120,
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      col.display({
        id: "actions",
        size: 48,
        cell: ({ row }) => {
          const product = row.original;
          const isOpen = actionMenuId === product.id;
          return (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActionMenuId(isOpen ? null : product.id);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10 dark:hover:text-neutral-300"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {isOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setActionMenuId(null)}
                  />
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-neutral-900">
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuId(null);
                        onOpenDialog(product.id);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Редактировать
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuId(null);
                        handleDuplicate(product.id);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Дублировать
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setActionMenuId(null);
                        await bulkUpdateStatusAction([product.id], "archived");
                        toast.success("Товар архивирован");
                        fetchData();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      В архив
                    </button>
                    <div className="my-1 border-t border-neutral-100 dark:border-white/5" />
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuId(null);
                        setDeleteId(product.id);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Удалить
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        },
      }),
    ],
    [onOpenDialog, actionMenuId, fetchData],
  );

  const pageCount = Math.ceil(total / perPage);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      rowSelection,
      pagination: { pageIndex: page - 1, pageSize: perPage },
    },
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize: perPage })
          : updater;
      setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    enableRowSelection: true,
  });

  const selectedCount = Object.keys(rowSelection).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Товары"
        description={`${total} товаров`}
        actions={
          <button
            type="button"
            onClick={() => onOpenDialog()}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
          >
            <Plus className="h-4 w-4" />
            Добавить товар
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <AdminSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Поиск по названию..."
          className="sm:w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as ProductStatus | "");
            setPage(1);
          }}
          className="h-10 rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
        >
          <option value="">Все статусы</option>
          <option value="active">Активные</option>
          <option value="draft">Черновики</option>
          <option value="archived">Архив</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value ? Number(e.target.value) : "");
            setPage(1);
          }}
          className="h-10 rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
        >
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {selectedCount > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-brand-orange/10 px-3 py-1.5 text-sm font-medium text-brand-orange">
            <span>Выбрано: {selectedCount}</span>
            <button
              type="button"
              onClick={() => handleBulkStatus("active")}
              className="rounded px-2 py-0.5 hover:bg-brand-orange/20"
            >
              Активировать
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus("archived")}
              className="rounded px-2 py-0.5 hover:bg-brand-orange/20"
            >
              В архив
            </button>
            <button
              type="button"
              onClick={() => setBulkDeleteOpen(true)}
              className="rounded px-2 py-0.5 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-500/20"
            >
              Удалить
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
        </div>
      ) : (
        <AdminTable
          table={table}
          emptyMessage="Товары не найдены"
          emptyIcon={<Package className="h-8 w-8" />}
        />
      )}

      {/* Delete single */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Удалить товар?"
        description="Товар будет перемещён в архив. Это действие можно отменить."
        confirmText="Удалить"
        variant="danger"
      />

      {/* Delete bulk */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Удалить ${selectedCount} товаров?`}
        description="Товары будут перемещены в архив."
        confirmText="Удалить все"
        variant="danger"
      />
    </div>
  );
}
