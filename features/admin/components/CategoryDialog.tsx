"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { categorySchema, type CategoryFormData } from "@/features/admin/schemas/category";
import { transliterate } from "@/lib/transliterate";
import {
  fetchCategoriesFlatAction,
  createCategoryAction,
  updateCategoryAction,
} from "@/features/admin/actions/categories";
import type { Row } from "@/lib/supabase/table-types";

type CategoryFlat = Row<"categories">;

interface CategoryDialogProps {
  open: boolean;
  editId?: number | null;
  parentId?: number | null;
  onClose: () => void;
  onSaved: () => void;
}

const defaultValues: CategoryFormData = {
  name: "",
  slug: "",
  parent_id: null,
  description: null,
  icon: null,
  image_url: null,
  cover_url: null,
  is_active: true,
  is_featured: false,
  sort_order: 0,
  seo_title: null,
  seo_description: null,
  seo_keywords: null,
};

export default function CategoryDialog({
  open,
  editId,
  parentId,
  onClose,
  onSaved,
}: CategoryDialogProps) {
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryFlat[]>([]);
  const isEdit = typeof editId === "number";

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  const nameValue = watch("name");
  const slugValue = watch("slug");

  // Auto-slug
  useEffect(() => {
    if (!isEdit && nameValue && !slugValue) {
      setValue("slug", transliterate(nameValue));
    }
  }, [nameValue, isEdit, slugValue, setValue]);

  // Load categories for parent select
  useEffect(() => {
    if (open) {
      fetchCategoriesFlatAction().then(setCategories).catch(() => {});
    }
  }, [open]);

  // Load existing data for edit
  useEffect(() => {
    if (!open) return;

    if (isEdit && editId) {
      // Find in categories
      const cat = categories.find((c) => c.id === editId);
      if (cat) {
        reset({
          name: cat.name,
          slug: cat.slug,
          parent_id: cat.parent_id,
          description: cat.description,
          icon: cat.icon,
          image_url: cat.image_url,
          cover_url: cat.cover_url,
          is_active: cat.is_active,
          is_featured: cat.is_featured,
          sort_order: cat.sort_order,
          seo_title: cat.seo_title,
          seo_description: cat.seo_description,
          seo_keywords: cat.seo_keywords,
        });
      }
    } else {
      reset({
        ...defaultValues,
        parent_id: parentId ?? null,
      });
    }
  }, [open, editId, parentId, isEdit, categories, reset]);

  async function onSubmit(data: CategoryFormData) {
    setSaving(true);
    try {
      if (isEdit && editId) {
        await updateCategoryAction(editId, data);
        toast.success("Категория обновлена");
      } else {
        await createCategoryAction(data);
        toast.success("Категория создана");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-neutral-900 dark:border dark:border-white/10"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="mb-6 text-lg font-bold text-brand-dark dark:text-white">
              {isEdit ? "Редактирование категории" : "Новая категория"}
            </h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Field label="Название *" error={errors.name?.message}>
                <input
                  {...register("name")}
                  className={inputClass(!!errors.name)}
                  placeholder="Наружная реклама"
                />
              </Field>

              <Field label="Slug *" error={errors.slug?.message}>
                <input
                  {...register("slug")}
                  className={inputClass(!!errors.slug)}
                  placeholder="naruzhnaya-reklama"
                />
              </Field>

              <Field label="Родительская категория">
                <select
                  {...register("parent_id", {
                    setValueAs: (v: string) =>
                      v === "" ? null : Number(v),
                  })}
                  className={inputClass(false)}
                >
                  <option value="">Нет (корневая)</option>
                  {categories
                    .filter((c) => c.id !== editId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Описание">
                <textarea
                  {...register("description")}
                  rows={3}
                  className={inputClass(false) + " resize-y"}
                />
              </Field>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...register("is_active")}
                    className="accent-brand-orange"
                  />
                  Активна
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    {...register("is_featured")}
                    className="accent-brand-orange"
                  />
                  Избранная
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="SEO заголовок">
                  <input
                    {...register("seo_title")}
                    maxLength={60}
                    className={inputClass(false)}
                  />
                </Field>
                <Field label="SEO описание">
                  <input
                    {...register("seo_description")}
                    maxLength={160}
                    className={inputClass(false)}
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/10"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:opacity-50"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEdit ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return clsx(
    "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none transition-colors",
    "focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20",
    "dark:text-white dark:placeholder:text-neutral-500",
    hasError
      ? "border-red-500"
      : "border-neutral-200 hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/20",
  );
}
