"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createColumnHelper,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  X,
  Check,
  Minus,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import type { SeoEntity, SeoTemplates } from "@/features/admin/types";
import type { Row } from "@/lib/db/table-types";
import {
  redirectSchema,
  type RedirectFormData,
} from "@/features/admin/schemas/seo";
import {
  createRedirectAction,
  updateRedirectAction,
  deleteRedirectAction,
  saveSeoTemplatesAction,
} from "@/features/admin/actions/seo";
import AdminTable from "./AdminTable";
import AdminPageHeader from "./AdminPageHeader";
import ConfirmDialog from "./ConfirmDialog";

type Redirect = Row<"redirects">;

const seoCol = createColumnHelper<SeoEntity>();
const redirectCol = createColumnHelper<Redirect>();

const ENTITY_TABS = [
  { key: "meta" as const, label: "Мета-теги" },
  { key: "templates" as const, label: "Шаблоны" },
  { key: "redirects" as const, label: "Редиректы" },
];

const ENTITY_TYPES = [
  { key: "product" as const, label: "Товары" },
  { key: "category" as const, label: "Категории" },
  { key: "page" as const, label: "Страницы" },
  { key: "post" as const, label: "Статьи" },
];

interface SeoPageClientProps {
  initialEntities: Record<string, SeoEntity[]>;
  initialRedirects: Redirect[];
  initialTemplates: SeoTemplates;
}

export default function SeoPageClient({
  initialEntities,
  initialRedirects,
  initialTemplates,
}: SeoPageClientProps) {
  const [activeTab, setActiveTab] = useState<"meta" | "templates" | "redirects">("meta");
  const [activeEntityType, setActiveEntityType] = useState<"product" | "category" | "page" | "post">("product");
  const [entities] = useState(initialEntities);
  const [redirects, setRedirects] = useState(initialRedirects);

  // Templates form
  const [templateTitle, setTemplateTitle] = useState(initialTemplates.seo_title_template);
  const [templateDesc, setTemplateDesc] = useState(initialTemplates.seo_description_template);
  const [savingTemplates, setSavingTemplates] = useState(false);

  // Redirect dialog
  const [redirectDialogOpen, setRedirectDialogOpen] = useState(false);
  const [editRedirect, setEditRedirect] = useState<Redirect | null>(null);
  const [deleteRedirectId, setDeleteRedirectId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RedirectFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(redirectSchema) as any,
  });

  // SEO entities table
  const currentEntities = entities[activeEntityType] ?? [];

  const seoColumns = [
    seoCol.accessor("name", {
      header: "Название",
      cell: (info) => (
        <span className="font-medium text-brand-dark dark:text-neutral-200">
          {info.getValue()}
        </span>
      ),
    }),
    seoCol.accessor("slug", {
      header: "Slug",
      size: 140,
      cell: (info) => (
        <span className="font-mono text-xs text-neutral-500">
          {info.getValue()}
        </span>
      ),
    }),
    seoCol.accessor("seo_title", {
      header: "SEO Title",
      cell: (info) => (
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    seoCol.accessor("seo_description", {
      header: "SEO Description",
      cell: (info) => (
        <span className="max-w-[200px] truncate text-xs text-neutral-500">
          {info.getValue() || "—"}
        </span>
      ),
    }),
    seoCol.accessor("filled", {
      header: "SEO",
      size: 60,
      cell: (info) =>
        info.getValue() ? (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/20">
            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          </div>
        ) : (
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-100 dark:bg-white/10">
            <Minus className="h-3.5 w-3.5 text-neutral-400" />
          </div>
        ),
    }),
  ];

  const seoTable = useReactTable({
    data: currentEntities,
    columns: seoColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Redirects table
  const redirectColumns = [
    redirectCol.accessor("from_path", {
      header: "Откуда",
      cell: (info) => (
        <span className="font-mono text-sm text-brand-dark dark:text-neutral-200">
          {info.getValue()}
        </span>
      ),
    }),
    redirectCol.accessor("to_path", {
      header: "Куда",
      cell: (info) => (
        <span className="font-mono text-sm text-neutral-600 dark:text-neutral-400">
          {info.getValue()}
        </span>
      ),
    }),
    redirectCol.accessor("type", {
      header: "Тип",
      size: 80,
      cell: (info) => (
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            info.getValue() === 301
              ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
          )}
        >
          {info.getValue()}
        </span>
      ),
    }),
    redirectCol.accessor("is_active", {
      header: "Статус",
      size: 80,
      cell: (info) => (
        <span
          className={clsx(
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            info.getValue()
              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
              : "bg-gray-100 text-gray-500 dark:bg-gray-500/20 dark:text-gray-400",
          )}
        >
          {info.getValue() ? "Активен" : "Выключен"}
        </span>
      ),
    }),
    redirectCol.display({
      id: "actions",
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => openEditRedirect(row.original)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-brand-orange dark:hover:bg-white/10"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteRedirectId(row.original.id)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    }),
  ];

  const redirectTable = useReactTable({
    data: redirects,
    columns: redirectColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  function openCreateRedirect() {
    setEditRedirect(null);
    reset({
      from_path: "",
      to_path: "",
      type: 301,
      is_active: true,
    });
    setRedirectDialogOpen(true);
  }

  function openEditRedirect(r: Redirect) {
    setEditRedirect(r);
    reset({
      from_path: r.from_path,
      to_path: r.to_path,
      type: r.type as 301 | 302,
      is_active: r.is_active,
    });
    setRedirectDialogOpen(true);
  }

  async function onSubmitRedirect(data: RedirectFormData) {
    try {
      if (editRedirect) {
        await updateRedirectAction(editRedirect.id, data);
        toast.success("Редирект обновлён");
      } else {
        await createRedirectAction(data);
        toast.success("Редирект создан");
      }
      setRedirectDialogOpen(false);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  }

  async function handleDeleteRedirect(id: number) {
    try {
      await deleteRedirectAction(id);
      setRedirects((prev) => prev.filter((r) => r.id !== id));
      toast.success("Редирект удалён");
      setDeleteRedirectId(null);
    } catch {
      toast.error("Ошибка удаления");
    }
  }

  async function handleSaveTemplates() {
    setSavingTemplates(true);
    try {
      await saveSeoTemplatesAction({
        seo_title_template: templateTitle,
        seo_description_template: templateDesc,
      });
      toast.success("Шаблоны сохранены");
    } catch {
      toast.error("Ошибка сохранения");
    } finally {
      setSavingTemplates(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="SEO" />

      {/* Main Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-white/5">
        {ENTITY_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={clsx(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "bg-white text-brand-dark shadow-sm dark:bg-white/10 dark:text-white"
                : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Meta-tags tab */}
      {activeTab === "meta" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {ENTITY_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveEntityType(t.key)}
                className={clsx(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  activeEntityType === t.key
                    ? "bg-brand-orange text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-400 dark:hover:bg-white/10",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <AdminTable
            table={seoTable}
            emptyMessage="Нет данных"
            emptyIcon={<Search className="h-8 w-8" />}
          />
        </div>
      )}

      {/* Templates tab */}
      {activeTab === "templates" && (
        <div className="max-w-xl space-y-4 rounded-xl border border-neutral-200 p-5 dark:border-white/10">
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-dark dark:text-white">
              Шаблон заголовка
            </label>
            <input
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              placeholder="{name} — купить в Ханты-Мансийске | 2×2"
              className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
            />
            <p className="mt-1 text-xs text-neutral-400">
              Переменные: {"{name}"}, {"{category}"}, {"{price}"}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-brand-dark dark:text-white">
              Шаблон описания
            </label>
            <textarea
              value={templateDesc}
              onChange={(e) => setTemplateDesc(e.target.value)}
              placeholder="{name} по цене от {price} ₽. Доставка по ХМАО. Компания 2×2."
              rows={3}
              className="w-full resize-none rounded-lg border border-neutral-200 bg-transparent p-3 text-sm dark:border-white/10 dark:text-white"
            />
          </div>
          <button
            type="button"
            onClick={handleSaveTemplates}
            disabled={savingTemplates}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:opacity-50"
          >
            {savingTemplates ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Сохранить шаблоны
          </button>
        </div>
      )}

      {/* Redirects tab */}
      {activeTab === "redirects" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={openCreateRedirect}
              className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover"
            >
              <Plus className="h-4 w-4" />
              Добавить редирект
            </button>
          </div>
          <AdminTable
            table={redirectTable}
            emptyMessage="Нет редиректов"
          />
        </div>
      )}

      {/* Redirect Dialog */}
      <AnimatePresence>
        {redirectDialogOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setRedirectDialogOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-neutral-900"
            >
              <button
                type="button"
                onClick={() => setRedirectDialogOpen(false)}
                className="absolute right-4 top-4 text-neutral-400"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="mb-4 text-lg font-semibold text-brand-dark dark:text-white">
                {editRedirect ? "Редактировать" : "Новый редирект"}
              </h3>
              <form
                onSubmit={handleSubmit(onSubmitRedirect)}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Откуда
                  </label>
                  <input
                    {...register("from_path")}
                    placeholder="/old-path"
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 font-mono text-sm dark:border-white/10 dark:text-white"
                  />
                  {errors.from_path && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.from_path.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Куда
                  </label>
                  <input
                    {...register("to_path")}
                    placeholder="/new-path"
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 font-mono text-sm dark:border-white/10 dark:text-white"
                  />
                  {errors.to_path && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.to_path.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      Тип
                    </label>
                    <select
                      {...register("type", { valueAsNumber: true })}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                    >
                      <option value={301}>301 (постоянный)</option>
                      <option value={302}>302 (временный)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 pb-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <input
                        type="checkbox"
                        {...register("is_active")}
                        className="h-4 w-4 rounded accent-brand-orange"
                      />
                      Активен
                    </label>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-orange py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editRedirect ? "Сохранить" : "Создать"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteRedirectId !== null}
        onClose={() => setDeleteRedirectId(null)}
        onConfirm={() => deleteRedirectId && handleDeleteRedirect(deleteRedirectId)}
        title="Удалить редирект?"
        confirmText="Удалить"
        variant="danger"
      />
    </div>
  );
}
