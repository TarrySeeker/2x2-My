"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  Save,
  Sparkles,
  X,
  Trash2,
} from "lucide-react";
import clsx from "clsx";

import {
  promotionSchema,
  type PromotionFormData,
} from "@/features/admin/schemas/promotions";
import {
  createPromotionAction,
  updatePromotionAction,
  deletePromotionAction,
} from "@/features/admin/actions/promotions";
import type { Promotion } from "@/types";
import AdminPageHeader from "./AdminPageHeader";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  initial?: Promotion;
}

function toFormDate(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return "";
    // datetime-local требует "YYYY-MM-DDTHH:mm"
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function toIsoOrNull(value: string | null | undefined): string | null {
  if (!value || value.trim() === "") return null;
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

export default function PromotionFormClient({ initial }: Props) {
  const router = useRouter();
  const isEdit = !!initial;
  const [uploading, setUploading] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PromotionFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(promotionSchema) as any,
    defaultValues: {
      title: initial?.title ?? "",
      body: initial?.body ?? "",
      image_url: initial?.image_url ?? null,
      link_url: initial?.link_url ?? null,
      link_text: initial?.link_text ?? null,
      valid_from: toFormDate(initial?.valid_from) || null,
      valid_to: toFormDate(initial?.valid_to) || null,
      is_active: initial?.is_active ?? true,
      show_as_popup: initial?.show_as_popup ?? false,
      sort_order: initial?.sort_order ?? 0,
    },
  });

  const imageUrl = watch("image_url");
  const showAsPopup = watch("show_as_popup");
  const isActive = watch("is_active");

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "images");
    fd.append("path", "uploads");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        toast.error("Ошибка загрузки");
        return;
      }
      const { url } = await res.json();
      setValue("image_url", url, { shouldValidate: true });
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(data: PromotionFormData) {
    const payload: PromotionFormData = {
      ...data,
      valid_from: toIsoOrNull(data.valid_from),
      valid_to: toIsoOrNull(data.valid_to),
    };

    if (isEdit && initial) {
      const res = await updatePromotionAction(initial.id, payload);
      if (!res.ok) {
        toast.error(res.error ?? "Ошибка сохранения");
        return;
      }
      toast.success("Акция обновлена");
      router.refresh();
    } else {
      const res = await createPromotionAction(payload);
      if (!res.ok) {
        toast.error(res.error ?? "Ошибка сохранения");
        return;
      }
      toast.success("Акция создана");
      router.push("/admin/content/promotions");
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!initial) return;
    setDeleting(true);
    const res = await deletePromotionAction(initial.id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error ?? "Ошибка");
      return;
    }
    toast.success("Акция удалена");
    router.push("/admin/content/promotions");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={isEdit ? "Редактирование акции" : "Новая акция"}
        description={
          isEdit
            ? "Внесите правки и сохраните"
            : "Заголовок, описание и срок действия"
        }
        actions={
          <Link
            href="/admin/content/promotions"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:text-brand-dark dark:border-white/10 dark:bg-white/5 dark:text-neutral-300 dark:hover:border-white/20 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад к списку
          </Link>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                Заголовок *
              </label>
              <input
                {...register("title")}
                className={clsx(
                  "h-11 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white",
                  errors.title && "border-red-400",
                )}
                placeholder="500 визиток в подарок"
              />
              {errors.title && (
                <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                Описание *
              </label>
              <textarea
                {...register("body")}
                rows={5}
                className={clsx(
                  "w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm leading-relaxed focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white",
                  errors.body && "border-red-400",
                )}
                placeholder="При заказе 500 визиток или листовок — 500 штук в подарок"
              />
              {errors.body && (
                <p className="mt-1 text-xs text-red-500">{errors.body.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                Изображение
              </label>
              {imageUrl ? (
                <div className="relative inline-block">
                  <Image
                    src={imageUrl}
                    alt=""
                    width={320}
                    height={180}
                    className="rounded-lg border border-neutral-200 object-cover dark:border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setValue("image_url", null)}
                    className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md"
                    aria-label="Удалить"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex h-44 w-full max-w-md cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-200 bg-neutral-50 transition-colors hover:border-brand-orange/50 hover:bg-brand-orange/5 dark:border-white/10 dark:bg-white/[0.02]">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f);
                    }}
                  />
                  {uploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-neutral-400" />
                  )}
                  <span className="text-xs text-neutral-500">
                    Загрузить (рекомендуется 1200×675)
                  </span>
                </label>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                  Текст ссылки
                </label>
                <input
                  {...register("link_text")}
                  className="h-11 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white"
                  placeholder="Подробнее"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                  URL ссылки
                </label>
                <input
                  type="url"
                  {...register("link_url")}
                  className="h-11 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white"
                  placeholder="/contact"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
            <h3 className="text-sm font-semibold text-brand-dark dark:text-white">
              Период действия
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                  Действует с
                </label>
                <input
                  type="datetime-local"
                  {...register("valid_from")}
                  className="h-11 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                  Действует до
                </label>
                <input
                  type="datetime-local"
                  {...register("valid_to")}
                  className="h-11 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white"
                />
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              Оставьте поля пустыми, чтобы акция действовала бессрочно.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900">
            <h3 className="text-sm font-semibold text-brand-dark dark:text-white">
              Публикация
            </h3>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                {...register("is_active")}
                className="mt-0.5 h-4 w-4 rounded accent-brand-orange"
              />
              <span>
                <span className="font-medium text-brand-dark dark:text-neutral-200">
                  Активна
                </span>
                <span className="block text-xs text-neutral-500">
                  Показывать в блоке «Акции» на главной
                </span>
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                {...register("show_as_popup")}
                disabled={!isActive}
                className="mt-0.5 h-4 w-4 rounded accent-brand-orange disabled:opacity-50"
              />
              <span>
                <span className="font-medium text-brand-dark dark:text-neutral-200">
                  Показывать в попапе
                </span>
                <span className="block text-xs text-neutral-500">
                  Всплывающее окно при первом визите
                </span>
              </span>
            </label>

            {showAsPopup && isActive && (
              <div className="rounded-lg border border-brand-orange/30 bg-brand-orange/5 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-orange">
                  <Sparkles className="h-3.5 w-3.5" />
                  Будет показываться при заходе на сайт
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                Порядок отображения
              </label>
              <input
                type="number"
                min={0}
                {...register("sort_order", { valueAsNumber: true })}
                className="h-11 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Меньшие значения — выше в списке
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || uploading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit ? "Сохранить" : "Создать"}
            </button>

            {isEdit && (
              <button
                type="button"
                onClick={() => setShowDelete(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/30 dark:bg-transparent dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            )}
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Удалить акцию?"
        description="Действие необратимо."
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
