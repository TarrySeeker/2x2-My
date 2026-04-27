"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Controller, useForm } from "react-hook-form";
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
  Plus,
  Edit3,
  Trash2,
  GripVertical,
  Loader2,
  X,
  Eye,
  EyeOff,
  Layers,
  ImageOff,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

import {
  serviceSchema,
  type ServiceFormData,
} from "@/features/admin/schemas/services";
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
  reorderServicesAction,
} from "@/features/admin/actions/services";
import type { Service } from "@/types";
import {
  SERVICE_CATEGORIES,
  getServiceCategoryLabel,
} from "@/lib/services/categories";
import AdminPageHeader from "./AdminPageHeader";
import ConfirmDialog from "./ConfirmDialog";
import ImageUploadField from "./ImageUploadField";

interface ServicesPageClientProps {
  initialServices: Service[];
}

// Общие input-классы (вынесены, чтобы все поля выглядели одинаково
// и совпадали со стилем других диалогов админки).
const inputCls =
  "h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white";

const textAreaCls =
  "w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm leading-relaxed focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white";

// Русское склонение по числу: 1 услуга, 2 услуги, 5 услуг.
function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export default function ServicesPageClient({
  initialServices,
}: ServicesPageClientProps) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const enabledCount = useMemo(
    () => services.filter((s) => s.enabled).length,
    [services],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(s: Service) {
    setEditing(s);
    setDialogOpen(true);
  }

  async function handleDelete(id: string) {
    setDeleting(true);
    const res = await deleteServiceAction(id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось удалить");
      return;
    }
    // Soft-delete: оставляем в списке с enabled=false, чтобы клиент видел
    // что можно вернуть.
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: false } : s)),
    );
    setDeleteId(null);
    toast.success("Услуга скрыта (можно вернуть переключателем)");
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = services.findIndex((s) => s.id === active.id);
    const newIdx = services.findIndex((s) => s.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(services, oldIdx, newIdx);
    setServices(reordered);

    const res = await reorderServicesAction({
      ids: reordered.map((s) => s.id),
    });
    if (!res.ok) {
      toast.error(res.error ?? "Ошибка сохранения порядка");
      setServices(services); // откат
    }
  }

  function handleSaved(saved: Service, isCreate: boolean) {
    setServices((prev) =>
      isCreate
        ? [...prev, saved]
        : prev.map((s) => (s.id === saved.id ? saved : s)),
    );
    setDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Услуги"
        description={`${services.length} ${plural(services.length, "услуга", "услуги", "услуг")} · ${enabledCount} опубликовано · перетаскивайте, чтобы менять порядок`}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
          >
            <Plus className="h-4 w-4" />
            Добавить услугу
          </button>
        }
      />

      {services.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 py-20 text-center dark:border-white/10">
          <Layers className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm text-neutral-500">Услуги ещё не добавлены</p>
          <button
            type="button"
            onClick={openCreate}
            className="text-sm font-semibold text-brand-orange hover:underline"
          >
            Добавить первую
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={services.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10">
              <div className="hidden grid-cols-[40px_72px_1fr_180px_120px_120px_140px] gap-3 border-b border-neutral-100 bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-neutral-400 lg:grid">
                <div></div>
                <div>Фото</div>
                <div>Название · slug</div>
                <div>Категория</div>
                <div>Цена</div>
                <div>Порядок</div>
                <div className="text-right">Действия</div>
              </div>
              <ul>
                {services.map((s) => (
                  <SortableRow
                    key={s.id}
                    service={s}
                    onEdit={() => openEdit(s)}
                    onDelete={() => setDeleteId(s.id)}
                  />
                ))}
              </ul>
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AnimatePresence>
        {dialogOpen && (
          <ServiceDialog
            service={editing}
            existingCount={services.length}
            onClose={() => setDialogOpen(false)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Скрыть услугу?"
        description="Услуга будет скрыта с витрины, но останется в админке — её можно вернуть переключателем «Показывать»."
        confirmText="Скрыть"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

function SortableRow({
  service,
  onEdit,
  onDelete,
}: {
  service: Service;
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
  } = useSortable({ id: service.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={clsx(
        "grid grid-cols-[40px_72px_1fr_140px] gap-3 border-b border-neutral-100 bg-white px-4 py-3 last:border-b-0 dark:border-white/5 dark:bg-neutral-900 lg:grid-cols-[40px_72px_1fr_180px_120px_120px_140px]",
        isDragging && "z-10 bg-orange-50 shadow-lg dark:bg-white/5",
        !service.enabled && "opacity-60",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Перетащить"
        className="flex h-10 w-10 cursor-grab items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/5 dark:hover:text-neutral-300"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="relative h-12 w-16 overflow-hidden rounded-md bg-neutral-100 dark:bg-white/5">
        {service.cover_image ? (
          <Image
            src={service.cover_image}
            alt={service.title}
            fill
            sizes="64px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageOff className="h-4 w-4 text-neutral-400" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-brand-dark dark:text-white">
            {service.title}
          </p>
          {!service.enabled && (
            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-600 dark:bg-white/10 dark:text-neutral-300">
              <EyeOff className="h-3 w-3" />
              скрыто
            </span>
          )}
        </div>
        <p className="truncate text-[11px] text-neutral-500">/{service.slug}</p>
      </div>

      <div className="hidden items-center text-xs text-neutral-500 lg:flex">
        {service.category
          ? getServiceCategoryLabel(service.category, service.category)
          : "—"}
      </div>

      <div className="hidden items-center text-xs text-neutral-600 dark:text-neutral-400 lg:flex">
        {service.price_label ?? (service.price_from ? `от ${service.price_from} ₽` : "—")}
      </div>

      <div className="hidden items-center text-xs text-neutral-500 lg:flex">
        {service.display_order}
      </div>

      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-brand-dark dark:hover:bg-white/5 dark:hover:text-white"
          aria-label="Редактировать"
        >
          <Edit3 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
          aria-label="Удалить"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function ServiceDialog({
  service,
  existingCount,
  onClose,
  onSaved,
}: {
  service: Service | null;
  existingCount: number;
  onClose: () => void;
  onSaved: (s: Service, isCreate: boolean) => void;
}) {
  const isEdit = !!service;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(serviceSchema) as any,
    defaultValues: {
      slug: service?.slug ?? "",
      title: service?.title ?? "",
      short_description: service?.short_description ?? null,
      long_description: service?.long_description ?? null,
      price_from: service?.price_from ?? null,
      price_unit: service?.price_unit ?? null,
      price_label: service?.price_label ?? null,
      icon: service?.icon ?? null,
      cover_image: service?.cover_image ?? null,
      // Для select RHF ожидает строку. null сбивает initial selectedIndex
      // на первый <option>, и при сохранении без явного клика категория
      // могла "сбрасываться". Пустая строка → option value="" (— не задана —).
      category: service?.category ?? "",
      href: service?.href ?? null,
      enabled: service?.enabled ?? true,
      display_order:
        service?.display_order ?? (existingCount + 1) * 10,
      features: (service?.features as string[] | null) ?? [],
      seo_title: service?.seo_title ?? null,
      seo_description: service?.seo_description ?? null,
    },
  });

  async function onSubmit(data: ServiceFormData) {
    if (isEdit && service) {
      const res = await updateServiceAction(service.id, data);
      if (!res.ok) {
        toast.error(res.error ?? "Ошибка сохранения");
        return;
      }
      toast.success("Услуга обновлена");
      if (res.service) onSaved(res.service, false);
    } else {
      const res = await createServiceAction(data);
      if (!res.ok) {
        toast.error(res.error ?? "Ошибка сохранения");
        return;
      }
      toast.success("Услуга добавлена");
      if (res.service) onSaved(res.service, true);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="relative my-8 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-neutral-900"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-lg font-bold text-brand-dark dark:text-white">
          {isEdit ? "Редактировать услугу" : "Новая услуга"}
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          Карточка отображается на главной (блок «Наши услуги») и на /services
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr]"
        >
          {/* Cover */}
          <div className="space-y-4">
            <Controller
              control={control}
              name="cover_image"
              render={({ field, fieldState }) => (
                <div>
                  <ImageUploadField
                    label="Обложка"
                    value={field.value ?? null}
                    onChange={(url) => field.onChange(url)}
                    pathPrefix="services"
                    previewAspect="video"
                    hint="3:2, JPG/PNG/WebP до 5 МБ"
                  />
                  {fieldState.error && (
                    <p className="mt-1 text-xs text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </div>
              )}
            />

            <label className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2.5 text-sm dark:border-white/10">
              <input
                type="checkbox"
                {...register("enabled")}
                className="h-4 w-4 rounded accent-brand-orange"
              />
              <Eye className="h-4 w-4 text-neutral-500" />
              <span className="text-brand-dark dark:text-neutral-200">
                Показывать на сайте
              </span>
            </label>

            <Field
              label="Порядок (меньше — выше)"
              error={errors.display_order?.message}
            >
              <input
                type="number"
                {...register("display_order", { valueAsNumber: true })}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Fields */}
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Название *" error={errors.title?.message}>
                <input
                  {...register("title")}
                  className={inputCls}
                  placeholder="Полиграфия"
                />
              </Field>
              <Field label="Slug *" error={errors.slug?.message}>
                <input
                  {...register("slug")}
                  className={inputCls}
                  placeholder="polygrafiya"
                />
              </Field>
            </div>

            <Field
              label="Короткое описание"
              error={errors.short_description?.message}
            >
              <textarea
                {...register("short_description")}
                rows={2}
                className={textAreaCls}
                placeholder="Визитки от 1 700 ₽ за 1 000 шт, листовки..."
              />
            </Field>

            <Field
              label="Подробное описание"
              error={errors.long_description?.message}
              hint="Используется на странице /services/[slug] (если включена)"
            >
              <textarea
                {...register("long_description")}
                rows={4}
                className={textAreaCls}
                placeholder="Развёрнутое описание услуги..."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Цена от (₽)"
                error={errors.price_from?.message}
                hint="Пусто = по запросу"
              >
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("price_from", {
                    setValueAs: (v) =>
                      v === "" || v === null || v === undefined
                        ? null
                        : Number(v),
                  })}
                  className={inputCls}
                  placeholder="1700"
                />
              </Field>
              <Field
                label="Единица"
                error={errors.price_unit?.message}
              >
                <input
                  {...register("price_unit")}
                  className={inputCls}
                  placeholder="м², см периметра, шт"
                />
              </Field>
              <Field
                label="Метка-бейдж"
                error={errors.price_label?.message}
                hint="Готовая строка для карточки"
              >
                <input
                  {...register("price_label")}
                  className={inputCls}
                  placeholder="от 1 700 ₽"
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Категория"
                error={errors.category?.message}
                hint="Влияет на группировку карточек на /services"
              >
                {/*
                  ВАЖНО: НЕ передаём `defaultValue` на select — он конфликтует
                  с `register` от RHF. RHF сам выставляет initial value через
                  ref на основе useForm({ defaultValues: { category } }).
                  При параллельном `defaultValue` React предупреждал и в
                  некоторых сценариях value сбивался при первой синхронизации.
                */}
                <select
                  {...register("category")}
                  className={inputCls}
                >
                  <option value="">— не задана —</option>
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="Иконка (lucide-react)"
                error={errors.icon?.message}
                hint="printer, megaphone, lightbulb, building-2..."
              >
                <input
                  {...register("icon")}
                  className={inputCls}
                  placeholder="printer"
                />
              </Field>
            </div>

            <Field
              label="Ссылка карточки"
              error={errors.href?.message}
              hint="Куда ведёт клик: /services, /contacts..."
            >
              <input
                {...register("href")}
                className={inputCls}
                placeholder="/services"
              />
            </Field>

            <Controller
              control={control}
              name="features"
              render={({ field, fieldState }) => (
                <Field
                  label="Преимущества (по одному в строке)"
                  hint="Например: «Срок 1-3 дня», «Дизайн в подарок»"
                  error={fieldState.error?.message}
                >
                  <textarea
                    rows={4}
                    className={textAreaCls}
                    placeholder={
                      "Срок 1-3 дня\nДизайн в подарок\nГарантия 12 мес"
                    }
                    value={
                      Array.isArray(field.value) ? field.value.join("\n") : ""
                    }
                    onChange={(e) => {
                      const list = e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean);
                      field.onChange(list);
                    }}
                    onBlur={field.onBlur}
                  />
                </Field>
              )}
            />

            <details className="rounded-xl border border-neutral-200 px-4 py-3 dark:border-white/10">
              <summary className="cursor-pointer text-sm font-semibold text-brand-dark dark:text-neutral-200">
                SEO (опционально)
              </summary>
              <div className="mt-4 space-y-4">
                <Field label="SEO Title" error={errors.seo_title?.message}>
                  <input {...register("seo_title")} className={inputCls} />
                </Field>
                <Field
                  label="SEO Description"
                  error={errors.seo_description?.message}
                >
                  <textarea
                    {...register("seo_description")}
                    rows={3}
                    className={textAreaCls}
                  />
                </Field>
              </div>
            </details>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-neutral-100 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/15"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Сохранить" : "Добавить"}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="mt-1 text-[11px] text-neutral-500">{hint}</p>
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
