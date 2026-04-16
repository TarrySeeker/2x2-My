"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  ArrowLeft,
  GripVertical,
  Plus,
  Edit3,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import type { Row } from "@/lib/supabase/table-types";
import { transliterate } from "@/lib/transliterate";
import { blogCategorySchema, type BlogCategoryFormData } from "@/features/admin/schemas/blog";
import {
  fetchBlogCategoriesAction,
  createBlogCategoryAction,
  updateBlogCategoryAction,
  deleteBlogCategoryAction,
} from "@/features/admin/actions/blog";
import AdminPageHeader from "./AdminPageHeader";
import ConfirmDialog from "./ConfirmDialog";

type BlogCategory = Row<"blog_categories">;

function SortableCategory({
  category,
  onEdit,
  onDelete,
}: {
  category: BlogCategory;
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
      <div className="flex-1">
        <p className="font-medium text-brand-dark dark:text-white">
          {category.name}
        </p>
        <p className="text-xs text-neutral-500">{category.slug}</p>
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

export default function BlogCategoriesClient() {
  const router = useRouter();
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<BlogCategory | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBlogCategoriesAction();
      setCategories(data);
    } catch {
      toast.error("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = categories.findIndex((c) => c.id === active.id);
    const newIdx = categories.findIndex((c) => c.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(categories, oldIdx, newIdx);
    setCategories(reordered);

    // Save sort order for each
    Promise.all(
      reordered.map((cat, idx) =>
        updateBlogCategoryAction(cat.id, {
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          sort_order: idx,
        }),
      ),
    ).catch(() => toast.error("Ошибка сохранения порядка"));
  }

  async function handleDelete(id: number) {
    try {
      await deleteBlogCategoryAction(id);
      toast.success("Категория удалена");
      setDeleteId(null);
      fetchData();
    } catch {
      toast.error("Ошибка удаления");
    }
  }

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BlogCategoryFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(blogCategorySchema) as any,
  });

  const nameVal = watch("name");

  useEffect(() => {
    if (dialogOpen && !editCategory && nameVal) {
      setValue("slug", transliterate(nameVal));
    }
  }, [nameVal, dialogOpen, editCategory, setValue]);

  function openCreate() {
    setEditCategory(null);
    reset({ name: "", slug: "", description: null, sort_order: categories.length });
    setDialogOpen(true);
  }

  function openEdit(cat: BlogCategory) {
    setEditCategory(cat);
    reset({
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      sort_order: cat.sort_order,
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: BlogCategoryFormData) {
    try {
      if (editCategory) {
        await updateBlogCategoryAction(editCategory.id, data);
        toast.success("Категория обновлена");
      } else {
        await createBlogCategoryAction(data);
        toast.success("Категория создана");
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Категории блога"
        actions={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/blog")}
              className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-600 dark:border-white/10 dark:text-neutral-300"
            >
              <ArrowLeft className="h-4 w-4" />
              К статьям
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-hover"
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
        </div>
      ) : categories.length === 0 ? (
        <p className="py-12 text-center text-neutral-400">
          Категории блога не созданы
        </p>
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
            <div className="space-y-2">
              {categories.map((cat) => (
                <SortableCategory
                  key={cat.id}
                  category={cat}
                  onEdit={() => openEdit(cat)}
                  onDelete={() => setDeleteId(cat.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Dialog */}
      <AnimatePresence>
        {dialogOpen && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
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
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-neutral-900"
            >
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="absolute right-4 top-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="mb-4 text-lg font-semibold text-brand-dark dark:text-white">
                {editCategory ? "Редактировать" : "Новая категория"}
              </h3>
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Название
                  </label>
                  <input
                    {...register("name")}
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.name.message}
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
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-500">
                    Описание
                  </label>
                  <textarea
                    {...register("description")}
                    rows={2}
                    className="w-full resize-none rounded-lg border border-neutral-200 bg-transparent p-3 text-sm dark:border-white/10 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-orange py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editCategory ? "Сохранить" : "Создать"}
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
        title="Удалить категорию?"
        description="Посты этой категории станут без категории."
        confirmText="Удалить"
        variant="danger"
      />
    </div>
  );
}
