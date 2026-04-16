"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Ticket, Plus, Pencil, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { PromoCode } from "@/types";
import {
  fetchPromoCodesAction,
  deletePromoCodeAction,
} from "@/features/admin/actions/promos";
import AdminTable from "./AdminTable";
import AdminPageHeader from "./AdminPageHeader";
import ConfirmDialog from "./ConfirmDialog";
import PromoDialog from "./PromoDialog";

type PromoStatus = "all" | "active" | "inactive" | "expired";

const STATUS_TABS: { key: PromoStatus; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "active", label: "Активные" },
  { key: "inactive", label: "Неактивные" },
  { key: "expired", label: "Истёкшие" },
];

function getPromoStatusLabel(promo: PromoCode): {
  label: string;
  className: string;
} {
  const now = new Date();
  if (promo.valid_to && new Date(promo.valid_to) < now) {
    return {
      label: "Истёк",
      className:
        "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
    };
  }
  if (!promo.is_active) {
    return {
      label: "Неактивен",
      className:
        "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
    };
  }
  return {
    label: "Активен",
    className:
      "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
  };
}

const col = createColumnHelper<PromoCode>();

function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Код скопирован");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      className="group flex items-center gap-1.5"
      title="Скопировать код"
    >
      <span className="font-mono text-xs font-bold tracking-wider text-brand-orange">
        {code}
      </span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

export default function PromoListClient() {
  const [data, setData] = useState<PromoCode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PromoStatus>("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<PromoCode | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPromoCodesAction({
        status: activeTab,
        page,
        per_page: perPage,
      });
      setData(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Ошибка загрузки промокодов");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const result = await deletePromoCodeAction(deleteId);
      if (result.success) {
        toast.success("Промокод удалён");
        setDeleteId(null);
        fetchData();
      } else {
        toast.error(result.error ?? "Ошибка удаления");
      }
    } catch {
      toast.error("Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  }

  function handleEdit(promo: PromoCode) {
    setEditItem(promo);
    setDialogOpen(true);
  }

  function handleCreate() {
    setEditItem(null);
    setDialogOpen(true);
  }

  const columns = useMemo(
    () => [
      col.accessor("code", {
        header: "Код",
        size: 140,
        cell: (info) => <CopyableCode code={info.getValue()} />,
      }),
      col.accessor("type", {
        header: "Тип",
        size: 80,
        cell: (info) => (
          <span
            className={clsx(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
              info.getValue() === "percent"
                ? "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400"
                : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
            )}
          >
            {info.getValue() === "percent" ? "%" : "Фикс."}
          </span>
        ),
      }),
      col.accessor("value", {
        header: "Значение",
        size: 100,
        cell: (info) => {
          const row = info.row.original;
          return (
            <span className="font-semibold text-brand-dark dark:text-white">
              {row.type === "percent"
                ? `${info.getValue()}%`
                : `${new Intl.NumberFormat("ru-RU").format(info.getValue())} ₽`}
            </span>
          );
        },
      }),
      col.accessor("min_order_amount", {
        header: "Мин. сумма",
        size: 110,
        cell: (info) => {
          const val = info.getValue();
          return val ? (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              от {new Intl.NumberFormat("ru-RU").format(val)} ₽
            </span>
          ) : (
            <span className="text-xs text-neutral-400">—</span>
          );
        },
      }),
      col.accessor("used_count", {
        header: "Исп.",
        size: 80,
        cell: (info) => {
          const row = info.row.original;
          const used = info.getValue() ?? 0;
          const max = row.max_uses;
          return (
            <span className="text-xs text-neutral-600 dark:text-neutral-300">
              {used} / {max && max > 0 ? max : "∞"}
            </span>
          );
        },
      }),
      col.accessor("valid_from", {
        header: "Период",
        size: 160,
        cell: (info) => {
          const row = info.row.original;
          const from = info.getValue();
          const to = row.valid_to;
          if (!from && !to) {
            return (
              <span className="text-xs text-neutral-400">Бессрочно</span>
            );
          }
          const fmt = (d: string) =>
            new Date(d).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            });
          return (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {from ? fmt(from) : "..."} — {to ? fmt(to) : "..."}
            </span>
          );
        },
      }),
      col.display({
        id: "status",
        header: "Статус",
        size: 100,
        cell: ({ row }) => {
          const status = getPromoStatusLabel(row.original);
          return (
            <span
              className={clsx(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                status.className,
              )}
            >
              {status.label}
            </span>
          );
        },
      }),
      col.display({
        id: "actions",
        size: 80,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(row.original);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-orange dark:hover:bg-white/10"
              title="Редактировать"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(row.original.id);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
              title="Удалить"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
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

  const editData = editItem
    ? {
        id: editItem.id,
        code: editItem.code,
        description: editItem.description,
        type: editItem.type as "fixed" | "percent",
        value: editItem.value,
        min_order_amount: editItem.min_order_amount,
        max_discount_amount: editItem.max_discount_amount,
        max_uses: editItem.max_uses,
        is_active: editItem.is_active,
        valid_from: editItem.valid_from,
        valid_to: editItem.valid_to,
      }
    : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Промокоды"
        description={`${total} промокодов`}
        actions={
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
          >
            <Plus className="h-4 w-4" />
            Создать
          </button>
        }
      />

      {/* Status tabs */}
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
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === tab.key
                ? "bg-white text-brand-dark shadow-sm dark:bg-white/10 dark:text-white"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
        </div>
      ) : (
        <AdminTable
          table={table}
          emptyMessage="Промокоды не найдены"
          emptyIcon={<Ticket className="h-8 w-8" />}
        />
      )}

      {/* Create/Edit dialog */}
      <PromoDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditItem(null);
        }}
        onSaved={fetchData}
        editData={editData}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Удалить промокод?"
        description="Промокод будет удалён безвозвратно. Это действие нельзя отменить."
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
