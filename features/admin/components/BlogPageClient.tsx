"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  FileText,
  Plus,
  Eye,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { PostStatus } from "@/types/database";
import type { BlogPostFilters, BlogPostFull } from "@/features/admin/types";
import {
  fetchBlogPostsAction,
  deleteBlogPostAction,
} from "@/features/admin/actions/blog";
import AdminTable from "./AdminTable";
import AdminSearch from "./AdminSearch";
import AdminPageHeader from "./AdminPageHeader";
import StatusBadge from "./StatusBadge";
import ConfirmDialog from "./ConfirmDialog";

const col = createColumnHelper<BlogPostFull>();

const STATUS_TABS: { key: PostStatus | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "published", label: "Опубликованные" },
  { key: "draft", label: "Черновики" },
  { key: "archived", label: "Архив" },
];

export default function BlogPageClient() {
  const router = useRouter();
  const [data, setData] = useState<BlogPostFull[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PostStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);

  const perPage = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: BlogPostFilters = {
        search: search || undefined,
        status: activeTab !== "all" ? activeTab : undefined,
        page,
        perPage,
      };
      const result = await fetchBlogPostsAction(filters);
      setData(result.data);
      setTotal(result.total);
    } catch {
      toast.error("Ошибка загрузки статей");
    } finally {
      setLoading(false);
    }
  }, [search, activeTab, page, perPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(id: number) {
    try {
      await deleteBlogPostAction(id);
      toast.success("Статья удалена");
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error("Ошибка удаления");
    }
  }

  const columns = useMemo(
    () => [
      col.accessor("cover_image_url", {
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
                <FileText className="h-4 w-4 text-neutral-300" />
              </div>
            )}
          </div>
        ),
      }),
      col.accessor("title", {
        header: "Заголовок",
        cell: (info) => (
          <button
            type="button"
            onClick={() => router.push(`/admin/blog/${info.row.original.id}`)}
            className="text-left font-medium text-brand-dark hover:text-brand-orange dark:text-neutral-200 dark:hover:text-brand-orange"
          >
            {info.getValue()}
          </button>
        ),
      }),
      col.accessor("category_name", {
        header: "Категория",
        size: 140,
        cell: (info) => (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {info.getValue() ?? "—"}
          </span>
        ),
      }),
      col.accessor("author_full_name", {
        header: "Автор",
        size: 140,
        cell: (info) => (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {info.getValue() ?? "—"}
          </span>
        ),
      }),
      col.accessor("status", {
        header: "Статус",
        size: 120,
        cell: (info) => <StatusBadge status={info.getValue()} />,
      }),
      col.accessor("views_count", {
        header: "Просмотры",
        size: 90,
        cell: (info) => (
          <span className="text-sm text-neutral-500">
            {info.getValue()}
          </span>
        ),
      }),
      col.accessor("created_at", {
        header: "Дата",
        size: 100,
        cell: (info) => (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {new Date(info.getValue()).toLocaleDateString("ru-RU")}
          </span>
        ),
      }),
      col.display({
        id: "actions",
        size: 48,
        cell: ({ row }) => {
          const post = row.original;
          const isOpen = actionMenuId === post.id;
          return (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActionMenuId(isOpen ? null : post.id);
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
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-neutral-900">
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuId(null);
                        router.push(`/admin/blog/${post.id}`);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-white/5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Редактировать
                    </button>
                    <div className="my-1 border-t border-neutral-100 dark:border-white/5" />
                    <button
                      type="button"
                      onClick={() => {
                        setActionMenuId(null);
                        setDeleteId(post.id);
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
    [router, actionMenuId],
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
        title="Блог"
        description={`${total} статей`}
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/blog/categories")}
              className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
            >
              Категории
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/blog/new")}
              className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
            >
              <Plus className="h-4 w-4" />
              Новая статья
            </button>
          </div>
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

      <AdminSearch
        value={search}
        onChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        placeholder="Поиск по заголовку..."
        className="sm:w-64"
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
        </div>
      ) : (
        <AdminTable
          table={table}
          emptyMessage="Статьи не найдены"
          emptyIcon={<FileText className="h-8 w-8" />}
          onRowClick={(row) => router.push(`/admin/blog/${row.id}`)}
        />
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Удалить статью?"
        description="Статья будет удалена безвозвратно."
        confirmText="Удалить"
        variant="danger"
      />
    </div>
  );
}
