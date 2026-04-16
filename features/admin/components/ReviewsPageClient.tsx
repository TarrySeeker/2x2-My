"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  MessageSquare,
  Star,
  Check,
  XCircle,
  Eye,
  Trash2,
  Loader2,
  CheckCheck,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { ReviewStatus } from "@/types/database";
import type { AdminReview, ReviewsStats } from "@/features/admin/api/reviews";
import {
  fetchAdminReviewsAction,
  approveReviewAction,
  rejectReviewAction,
  bulkApproveAction,
  deleteReviewAction,
  fetchReviewsStatsAction,
} from "@/features/admin/actions/reviews";
import AdminTable from "./AdminTable";
import AdminPageHeader from "./AdminPageHeader";
import ConfirmDialog from "./ConfirmDialog";
import ReviewDetailDialog from "./ReviewDetailDialog";
import ReviewStatsCards from "./ReviewStatsCards";
import StatusBadge from "./StatusBadge";

const col = createColumnHelper<AdminReview>();

const STATUS_TABS: { key: ReviewStatus | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "pending", label: "На модерации" },
  { key: "approved", label: "Одобренные" },
  { key: "rejected", label: "Отклонённые" },
];

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={clsx(
            "h-3.5 w-3.5",
            i <= rating
              ? "fill-amber-400 text-amber-400"
              : "text-neutral-300 dark:text-neutral-600",
          )}
        />
      ))}
    </div>
  );
}

interface ReviewsPageClientProps {
  initialStats: ReviewsStats;
}

export default function ReviewsPageClient({
  initialStats,
}: ReviewsPageClientProps) {
  const [data, setData] = useState<AdminReview[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReviewsStats>(initialStats);
  const [activeTab, setActiveTab] = useState<ReviewStatus | "all">("pending");
  const [page, setPage] = useState(1);

  // Selection for bulk approve
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Detail dialog
  const [detailReview, setDetailReview] = useState<AdminReview | null>(null);

  // Delete
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Inline moderation loading
  const [moderatingId, setModeratingId] = useState<number | null>(null);

  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAdminReviewsAction({
        status: activeTab !== "all" ? activeTab : undefined,
        page,
        per_page: perPage,
      });
      setData(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Ошибка загрузки отзывов");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  const refreshStats = useCallback(async () => {
    try {
      const newStats = await fetchReviewsStatsAction();
      setStats(newStats);
    } catch {
      // Silent — stats are non-critical
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleRefresh() {
    setSelectedIds(new Set());
    fetchData();
    refreshStats();
  }

  // Inline approve
  async function handleInlineApprove(id: number) {
    setModeratingId(id);
    try {
      const result = await approveReviewAction(id);
      if (result.success) {
        toast.success("Отзыв одобрен");
        handleRefresh();
      } else {
        toast.error(result.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка одобрения");
    } finally {
      setModeratingId(null);
    }
  }

  // Inline reject
  async function handleInlineReject(id: number) {
    setModeratingId(id);
    try {
      const result = await rejectReviewAction(id);
      if (result.success) {
        toast.success("Отзыв отклонён");
        handleRefresh();
      } else {
        toast.error(result.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка отклонения");
    } finally {
      setModeratingId(null);
    }
  }

  // Bulk approve
  async function handleBulkApprove() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const result = await bulkApproveAction({ ids: Array.from(selectedIds) });
      if (result.success) {
        toast.success(`Одобрено отзывов: ${selectedIds.size}`);
        handleRefresh();
      } else {
        toast.error(result.error ?? "Ошибка");
      }
    } catch {
      toast.error("Ошибка массового одобрения");
    } finally {
      setBulkLoading(false);
    }
  }

  // Delete
  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const result = await deleteReviewAction(deleteId);
      if (result.success) {
        toast.success("Отзыв удалён");
        setDeleteId(null);
        handleRefresh();
      } else {
        toast.error(result.error ?? "Ошибка удаления");
      }
    } catch {
      toast.error("Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((r) => r.id)));
    }
  }

  const showCheckboxes = activeTab === "pending";

  const columns = useMemo(() => {
    const cols = [];

    // Checkbox column for pending tab
    if (showCheckboxes) {
      cols.push(
        col.display({
          id: "select",
          size: 40,
          header: () => (
            <input
              type="checkbox"
              checked={data.length > 0 && selectedIds.size === data.length}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-neutral-300 text-brand-orange focus:ring-brand-orange/50 dark:border-white/20"
              aria-label="Выбрать все"
            />
          ),
          cell: ({ row }) => (
            <input
              type="checkbox"
              checked={selectedIds.has(row.original.id)}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelect(row.original.id);
              }}
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded border-neutral-300 text-brand-orange focus:ring-brand-orange/50 dark:border-white/20"
              aria-label={`Выбрать отзыв #${row.original.id}`}
            />
          ),
        }),
      );
    }

    cols.push(
      col.accessor("rating", {
        header: "Рейтинг",
        size: 110,
        cell: (info) => <StarDisplay rating={info.getValue()} />,
      }),
      col.accessor("author_name", {
        header: "Автор",
        size: 130,
        cell: (info) => (
          <span className="text-sm font-medium text-brand-dark dark:text-neutral-200">
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor("product_name", {
        header: "Товар",
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="flex items-center gap-2">
              {row.product_image && (
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-white/10">
                  <Image
                    src={row.product_image}
                    alt=""
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <span className="truncate text-sm text-neutral-700 dark:text-neutral-300">
                {info.getValue() ?? "—"}
              </span>
            </div>
          );
        },
      }),
      col.accessor("text", {
        header: "Текст",
        cell: (info) => {
          const text = info.getValue();
          if (!text) return <span className="text-neutral-400">—</span>;
          const truncated =
            text.length > 100 ? text.slice(0, 100) + "..." : text;
          return (
            <span
              className="text-xs text-neutral-600 dark:text-neutral-400"
              title={text}
            >
              {truncated}
            </span>
          );
        },
      }),
      col.accessor("created_at", {
        header: "Дата",
        size: 90,
        cell: (info) => (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {new Date(info.getValue()).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "2-digit",
            })}
          </span>
        ),
      }),
    );

    // Status column for "all" tab
    if (activeTab === "all") {
      cols.push(
        col.accessor("status", {
          header: "Статус",
          size: 110,
          cell: (info) => <StatusBadge status={info.getValue()} />,
        }),
      );
    }

    cols.push(
      col.display({
        id: "actions",
        size: activeTab === "pending" ? 140 : 80,
        cell: ({ row }) => {
          const isLoading = moderatingId === row.original.id;
          return (
            <div
              className="flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Inline moderation for pending */}
              {row.original.status === "pending" && (
                <>
                  <button
                    type="button"
                    onClick={() => handleInlineApprove(row.original.id)}
                    disabled={isLoading}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-500 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-500/10"
                    title="Одобрить"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInlineReject(row.original.id)}
                    disabled={isLoading}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-500/10"
                    title="Отклонить"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setDetailReview(row.original)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-orange dark:hover:bg-white/10"
                title="Подробнее"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(row.original.id)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                title="Удалить"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        },
      }),
    );

    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCheckboxes, activeTab, selectedIds, data, moderatingId]);

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
        title="Отзывы"
        description={`${total} отзывов`}
      />

      {/* Stats cards */}
      <ReviewStatsCards stats={stats} />

      {/* Tabs + bulk action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-white/5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
                setSelectedIds(new Set());
              }}
              className={clsx(
                "relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-white text-brand-dark shadow-sm dark:bg-white/10 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
              )}
            >
              {tab.label}
              {tab.key === "pending" && stats.pending > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {stats.pending > 99 ? "99+" : stats.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bulk approve button */}
        {showCheckboxes && selectedIds.size > 0 && (
          <button
            type="button"
            onClick={handleBulkApprove}
            disabled={bulkLoading}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {bulkLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4" />
            )}
            Одобрить выбранные ({selectedIds.size})
          </button>
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
          emptyMessage="Отзывы не найдены"
          emptyIcon={<MessageSquare className="h-8 w-8" />}
          onRowClick={(row) => setDetailReview(row)}
        />
      )}

      {/* Detail dialog */}
      <ReviewDetailDialog
        open={detailReview !== null}
        onClose={() => setDetailReview(null)}
        review={detailReview}
        onModerated={handleRefresh}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Удалить отзыв?"
        description="Отзыв будет удалён безвозвратно. Это действие нельзя отменить."
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
