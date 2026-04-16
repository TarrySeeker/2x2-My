"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Edit3,
  Trash2,
  Loader2,
  X,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import type { Row } from "@/lib/supabase/table-types";
import { transliterate } from "@/lib/transliterate";
import { pageSchema, type PageFormData } from "@/features/admin/schemas/page";
import {
  createPageAction,
  updatePageAction,
  deletePageAction,
} from "@/features/admin/actions/pages";
import AdminPageHeader from "./AdminPageHeader";
import StatusBadge from "./StatusBadge";
import ConfirmDialog from "./ConfirmDialog";
import RichTextEditor from "./RichTextEditor";

type PageRow = Row<"pages">;

interface PagesPageClientProps {
  initialPages: PageRow[];
}

export default function PagesPageClient({
  initialPages,
}: PagesPageClientProps) {
  const [pages, setPages] = useState(initialPages);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPage, setEditPage] = useState<PageRow | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PageFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pageSchema) as any,
  });

  const titleVal = watch("title");
  const content = watch("content");

  useEffect(() => {
    if (dialogOpen && !editPage && titleVal) {
      setValue("slug", transliterate(titleVal));
    }
  }, [titleVal, dialogOpen, editPage, setValue]);

  function openCreate() {
    setEditPage(null);
    reset({
      title: "",
      slug: "",
      content: "",
      excerpt: null,
      cover_url: null,
      seo_title: null,
      seo_description: null,
      seo_keywords: null,
      is_active: true,
      show_in_footer: false,
      sort_order: pages.length,
    });
    setDialogOpen(true);
  }

  function openEdit(page: PageRow) {
    setEditPage(page);
    reset({
      title: page.title,
      slug: page.slug,
      content: page.content,
      excerpt: page.excerpt,
      cover_url: page.cover_url,
      seo_title: page.seo_title,
      seo_description: page.seo_description,
      seo_keywords: page.seo_keywords,
      is_active: page.is_active,
      show_in_footer: page.show_in_footer,
      sort_order: page.sort_order,
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: PageFormData) {
    try {
      if (editPage) {
        await updatePageAction(editPage.id, data);
        toast.success("Страница обновлена");
      } else {
        await createPageAction(data);
        toast.success("Страница создана");
      }
      setDialogOpen(false);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  }

  async function handleDelete(id: number) {
    try {
      await deletePageAction(id);
      setPages((prev) => prev.filter((p) => p.id !== id));
      toast.success("Страница удалена");
      setDeleteId(null);
    } catch {
      toast.error("Ошибка удаления");
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Статические страницы"
        description={`${pages.length} страниц`}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </button>
        }
      />

      {pages.length === 0 ? (
        <p className="py-12 text-center text-neutral-400">
          Страницы не созданы
        </p>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
            >
              <FileText className="h-5 w-5 shrink-0 text-neutral-400" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-brand-dark dark:text-white">
                  {page.title}
                </p>
                <p className="text-xs text-neutral-500">/{page.slug}</p>
              </div>
              <StatusBadge
                status={page.is_active ? "active" : "draft"}
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(page)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-brand-orange dark:hover:bg-white/10"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(page.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Page Dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 pt-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDialogOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative mb-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-neutral-900"
            >
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="mb-4 text-lg font-semibold text-brand-dark dark:text-white">
                {editPage ? "Редактировать страницу" : "Новая страница"}
              </h3>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      Название
                    </label>
                    <input
                      {...register("title")}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                    />
                    {errors.title && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.title.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      Slug
                    </label>
                    <input
                      {...register("slug")}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 font-mono text-sm dark:border-white/10 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Содержание
                  </label>
                  <RichTextEditor
                    value={content ?? ""}
                    onChange={(val) => setValue("content", val, { shouldValidate: true })}
                  />
                  {errors.content && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.content.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      SEO заголовок
                    </label>
                    <input
                      {...register("seo_title")}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      SEO описание
                    </label>
                    <input
                      {...register("seo_description")}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <input
                      type="checkbox"
                      {...register("is_active")}
                      className="h-4 w-4 rounded accent-brand-orange"
                    />
                    Активна
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <input
                      type="checkbox"
                      {...register("show_in_footer")}
                      className="h-4 w-4 rounded accent-brand-orange"
                    />
                    Показывать в футере
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-orange py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editPage ? "Сохранить" : "Создать"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Удалить страницу?"
        description="Страница будет удалена безвозвратно."
        confirmText="Удалить"
        variant="danger"
      />
    </div>
  );
}
