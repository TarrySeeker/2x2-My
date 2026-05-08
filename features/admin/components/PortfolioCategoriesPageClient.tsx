"use client";

import { useMemo, useState, useTransition } from "react";
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
  Plus,
  Edit3,
  Trash2,
  GripVertical,
  Loader2,
  X,
  Eye,
  EyeOff,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

import {
  portfolioCategorySchema,
  type PortfolioCategoryFormData,
} from "@/features/admin/schemas/portfolio-category";
import {
  createPortfolioCategoryAction,
  updatePortfolioCategoryAction,
  deletePortfolioCategoryAction,
  reorderPortfolioCategoriesAction,
} from "@/features/admin/actions/portfolio-categories";
import type { PortfolioCategory } from "@/types";
import AdminPageHeader from "./AdminPageHeader";
import ConfirmDialog from "./ConfirmDialog";

// Общие input-классы (вынесены, чтобы все поля выглядели одинаково
// и совпадали со стилем других диалогов админки).
const inputCls =
  "h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white";

const textAreaCls =
  "w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm leading-relaxed focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white";

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

function slugify(s: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
    з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
    п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
    ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
    я: "ya",
  };
  return s
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

interface PortfolioCategoriesPageClientProps {
  initialCategories: PortfolioCategory[];
}

export default function PortfolioCategoriesPageClient({
  initialCategories,
}: PortfolioCategoriesPageClientProps) {
  const [categories, setCategories] = useState<PortfolioCategory[]>(
    initialCategories,
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PortfolioCategory | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const publishedCount = useMemo(
    () => categories.filter((c) => c.is_published).length,
    [categories],
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(c: PortfolioCategory) {
    setEditing(c);
    setDialogOpen(true);
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    const res = await deletePortfolioCategoryAction(id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось удалить");
      return;
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setDeleteId(null);
    toast.success("Категория удалена");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = categories.findIndex((c) => c.id === active.id);
    const newIdx = categories.findIndex((c) => c.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(categories, oldIdx, newIdx);
    // sort_order = индекс*10 (с шагом, чтобы оставить место для вставок).
    const updates = reordered.map((c, idx) => ({
      ...c,
      sort_order: idx * 10,
    }));

    setCategories(updates);

    startTransition(async () => {
      const res = await reorderPortfolioCategoriesAction(
        updates.map(({ id, sort_order }) => ({ id, sort_order })),
      );
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось сохранить порядок");
        // Откат на исходный порядок
        setCategories(categories);
      }
    });
  }

  function handleSaved(saved: PortfolioCategory, isCreate: boolean) {
    setCategories((prev) =>
      isCreate
        ? [...prev, saved].sort(
            (a, b) =>
              Number(b.is_published) - Number(a.is_published) ||
              a.sort_order - b.sort_order ||
              a.id - b.id,
          )
        : prev.map((c) => (c.id === saved.id ? saved : c)),
    );
    setDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Категории портфолио"
        description={`${categories.length} ${plural(categories.length, "категория", "категории", "категорий")} · ${publishedCount} опубликовано · перетаскивайте, чтобы менять порядок`}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
          >
            <Plus className="h-4 w-4" />
            Добавить категорию
          </button>
        }
      />

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 py-20 text-center dark:border-white/10">
          <Layers className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm text-neutral-500">
            Категории ещё не добавлены
          </p>
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
            items={categories.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-white/10">
              <div className="hidden grid-cols-[40px_1fr_180px_120px_120px_120px] gap-3 border-b border-neutral-100 bg-neutral-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-neutral-400 lg:grid">
                <div></div>
                <div>Название</div>
                <div>Slug</div>
                <div>Порядок</div>
                <div>Статус</div>
                <div className="text-right">Действия</div>
              </div>
              <ul>
                {categories.map((c) => (
                  <SortableRow
                    key={c.id}
                    category={c}
                    onEdit={() => openEdit(c)}
                    onDelete={() => setDeleteId(c.id)}
                  />
                ))}
              </ul>
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AnimatePresence>
        {dialogOpen && (
          <CategoryDialog
            category={editing}
            existingCount={categories.length}
            onClose={() => setDialogOpen(false)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Удалить категорию?"
        description="Если есть работы, использующие эту категорию, удаление будет отклонено. Сначала переназначьте такие работы на другую категорию."
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

function SortableRow({
  category,
  onEdit,
  onDelete,
}: {
  category: PortfolioCategory;
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
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={clsx(
        "grid grid-cols-[40px_1fr_120px] gap-3 border-b border-neutral-100 bg-white px-4 py-3 last:border-b-0 dark:border-white/5 dark:bg-neutral-900 lg:grid-cols-[40px_1fr_180px_120px_120px_120px]",
        isDragging && "z-10 bg-orange-50 shadow-lg dark:bg-white/5",
        !category.is_published && "opacity-60",
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

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-brand-dark dark:text-white">
          {category.label}
        </p>
        {category.description && (
          <p className="truncate text-[11px] text-neutral-500">
            {category.description}
          </p>
        )}
      </div>

      <div className="hidden items-center font-mono text-xs text-neutral-500 lg:flex">
        {category.slug}
      </div>

      <div className="hidden items-center text-xs text-neutral-500 lg:flex">
        {category.sort_order}
      </div>

      <div className="hidden items-center text-xs lg:flex">
        {category.is_published ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Eye className="h-3 w-3" />
            Опубл.
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-neutral-500 dark:bg-white/5 dark:text-neutral-400">
            <EyeOff className="h-3 w-3" />
            Скрыта
          </span>
        )}
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

function CategoryDialog({
  category,
  existingCount,
  onClose,
  onSaved,
}: {
  category: PortfolioCategory | null;
  existingCount: number;
  onClose: () => void;
  onSaved: (c: PortfolioCategory, isCreate: boolean) => void;
}) {
  const isEdit = !!category;

  // useForm: defaultValues — пустые строки, НЕ null (LESSONS Категория 1):
  // null для <input> рендерится как uncontrolled, и при первом change React
  // ругается "switching from uncontrolled to controlled".
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PortfolioCategoryFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(portfolioCategorySchema) as any,
    defaultValues: {
      slug: category?.slug ?? "",
      label: category?.label ?? "",
      description: category?.description ?? "",
      sort_order: category?.sort_order ?? (existingCount + 1) * 10,
      is_published: category?.is_published ?? true,
    },
  });

  const labelValue = watch("label");
  const slugValue = watch("slug");

  function autoSlug() {
    if (!labelValue) return;
    const next = slugify(labelValue);
    if (next) setValue("slug", next, { shouldValidate: true });
  }

  async function onSubmit(data: PortfolioCategoryFormData) {
    if (isEdit && category) {
      const res = await updatePortfolioCategoryAction(category.id, data);
      if (!res.ok) {
        toast.error(res.error ?? "Ошибка сохранения");
        return;
      }
      toast.success("Категория обновлена");
      if (res.category) onSaved(res.category, false);
    } else {
      const res = await createPortfolioCategoryAction(data);
      if (!res.ok) {
        toast.error(res.error ?? "Ошибка сохранения");
        return;
      }
      toast.success("Категория добавлена");
      if (res.category) onSaved(res.category, true);
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
        className="relative my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-neutral-900"
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
          {isEdit ? "Редактировать категорию" : "Новая категория портфолио"}
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          Категория группирует работы на витрине (фильтр /portfolio) и
          в форме портфолио в админке.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-5">
          <Field label="Название *" error={errors.label?.message}>
            <input
              {...register("label")}
              className={inputCls}
              placeholder="Полиграфия"
            />
          </Field>

          <Field
            label="Slug *"
            error={errors.slug?.message}
            hint="Латиница, цифры, дефисы. Машинное имя для URL/фильтра."
          >
            <div className="flex gap-2">
              <input
                {...register("slug")}
                className={inputCls}
                placeholder="polygraphy"
              />
              <button
                type="button"
                onClick={autoSlug}
                title="Сгенерировать из названия"
                className="shrink-0 rounded-lg border border-neutral-200 px-3 text-xs text-neutral-600 hover:border-brand-orange hover:text-brand-orange dark:border-white/10 dark:text-neutral-300"
              >
                Auto
              </button>
            </div>
            {slugValue && (
              <p className="mt-1 font-mono text-[11px] text-neutral-400">
                slug = &quot;{slugValue.toLowerCase()}&quot;
              </p>
            )}
          </Field>

          <Field
            label="Описание (опционально)"
            error={errors.description?.message}
          >
            <textarea
              {...register("description")}
              rows={2}
              className={textAreaCls}
              placeholder="Короткое описание категории"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Порядок (меньше — выше)"
              error={errors.sort_order?.message}
            >
              <input
                type="number"
                {...register("sort_order", { valueAsNumber: true })}
                className={inputCls}
              />
            </Field>

            <label className="flex h-10 items-center gap-2 self-end rounded-lg border border-neutral-200 px-3 text-sm dark:border-white/10">
              <input
                type="checkbox"
                {...register("is_published")}
                className="h-4 w-4 rounded accent-brand-orange"
              />
              <Eye className="h-4 w-4 text-neutral-500" />
              <span className="text-brand-dark dark:text-neutral-200">
                Опубликовать
              </span>
            </label>
          </div>

          {isEdit && (
            <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900 dark:bg-blue-500/5 dark:text-blue-200">
              При смене названия работы, привязанные к старому значению,
              будут автоматически переподвязаны (не &laquo;вывалятся&raquo;
              из категории и фильтра).
            </p>
          )}

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
