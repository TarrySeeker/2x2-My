"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  X,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import type { Row } from "@/lib/db/table-types";
import { bannerSchema, type BannerFormData } from "@/features/admin/schemas/banner";
import {
  createBannerAction,
  updateBannerAction,
  deleteBannerAction,
  reorderBannersAction,
} from "@/features/admin/actions/banners";
import AdminPageHeader from "./AdminPageHeader";
import StatusBadge from "./StatusBadge";
import ConfirmDialog from "./ConfirmDialog";

type Banner = Row<"banners">;

function SortableBanner({
  banner,
  onEdit,
  onDelete,
}: {
  banner: Banner;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "flex items-center gap-3 rounded-xl border p-3 transition-colors",
        isDragging
          ? "z-10 border-brand-orange bg-brand-orange/5 shadow-lg"
          : "border-neutral-200 bg-white dark:border-white/10 dark:bg-white/5",
      )}
    >
      <div
        className="cursor-grab text-neutral-400"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-white/10">
        {banner.image_url ? (
          <Image
            src={banner.image_url}
            alt=""
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-4 w-4 text-neutral-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-brand-dark dark:text-white">
          {banner.title ?? "Без названия"}
        </p>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>{banner.position}</span>
          <StatusBadge
            status={banner.is_active ? "active" : "draft"}
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-brand-orange dark:hover:bg-white/10"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

interface BannersPageClientProps {
  initialBanners: Banner[];
}

export default function BannersPageClient({
  initialBanners,
}: BannersPageClientProps) {
  const [banners, setBanners] = useState(initialBanners);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BannerFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(bannerSchema) as any,
  });

  const imageUrl = watch("image_url");

  function openCreate() {
    setEditBanner(null);
    reset({
      title: null,
      subtitle: null,
      description: null,
      image_url: "",
      mobile_image_url: null,
      link: null,
      button_text: null,
      badge: null,
      position: "hero",
      is_active: true,
      active_from: null,
      active_to: null,
    });
    setDialogOpen(true);
  }

  function openEdit(banner: Banner) {
    setEditBanner(banner);
    reset({
      title: banner.title,
      subtitle: banner.subtitle,
      description: banner.description,
      image_url: banner.image_url,
      mobile_image_url: banner.mobile_image_url,
      link: banner.link,
      button_text: banner.button_text,
      badge: banner.badge,
      position: banner.position,
      is_active: banner.is_active,
      active_from: banner.active_from,
      active_to: banner.active_to,
    });
    setDialogOpen(true);
  }

  async function handleUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "images");
    formData.append("path", "banners");

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
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

  async function onSubmit(data: BannerFormData) {
    try {
      if (editBanner) {
        await updateBannerAction(editBanner.id, data);
        toast.success("Баннер обновлён");
      } else {
        await createBannerAction(data);
        toast.success("Баннер создан");
      }
      setDialogOpen(false);
      // Refresh via revalidation
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = banners.findIndex((b) => b.id === active.id);
    const newIdx = banners.findIndex((b) => b.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(banners, oldIdx, newIdx);
    setBanners(reordered);

    reorderBannersAction(reordered.map((b) => b.id)).catch(() =>
      toast.error("Ошибка сохранения порядка"),
    );
  }

  async function handleDelete(id: number) {
    try {
      await deleteBannerAction(id);
      setBanners((prev) => prev.filter((b) => b.id !== id));
      toast.success("Баннер удалён");
      setDeleteId(null);
    } catch {
      toast.error("Ошибка удаления");
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Баннеры"
        description={`${banners.length} баннеров`}
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

      {banners.length === 0 ? (
        <p className="py-12 text-center text-neutral-400">
          Баннеры не добавлены
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={banners.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {banners.map((banner) => (
                <SortableBanner
                  key={banner.id}
                  banner={banner}
                  onEdit={() => openEdit(banner)}
                  onDelete={() => setDeleteId(banner.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Banner Dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4"
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
              className="relative my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-neutral-900"
            >
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="mb-4 text-lg font-semibold text-brand-dark dark:text-white">
                {editBanner ? "Редактировать баннер" : "Новый баннер"}
              </h3>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      Заголовок
                    </label>
                    <input
                      {...register("title")}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      Позиция
                    </label>
                    <select
                      {...register("position")}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                    >
                      <option value="hero">Hero</option>
                      <option value="promo">Promo</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Подзаголовок
                  </label>
                  <input
                    {...register("subtitle")}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Изображение
                  </label>
                  {imageUrl ? (
                    <div className="relative aspect-video overflow-hidden rounded-lg border border-neutral-200 dark:border-white/10">
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="400px"
                      />
                      <button
                        type="button"
                        onClick={() => setValue("image_url", "", { shouldValidate: true })}
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-neutral-200 p-6 dark:border-white/10">
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(file);
                        }}
                      />
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-brand-orange" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-neutral-400" />
                      )}
                    </label>
                  )}
                  {errors.image_url && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.image_url.message}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      Ссылка
                    </label>
                    <input
                      {...register("link")}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-neutral-500">
                      Текст кнопки
                    </label>
                    <input
                      {...register("button_text")}
                      className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <input
                      type="checkbox"
                      {...register("is_active")}
                      className="h-4 w-4 rounded accent-brand-orange"
                    />
                    Активен
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
                  {editBanner ? "Сохранить" : "Создать"}
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
        title="Удалить баннер?"
        description="Баннер будет удалён безвозвратно."
        confirmText="Удалить"
        variant="danger"
      />
    </div>
  );
}
