"use client";

import { useState } from "react";
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
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import type { Row } from "@/lib/supabase/table-types";
import { menuItemSchema, type MenuItemFormData } from "@/features/admin/schemas/menu";
import {
  createMenuItemAction,
  updateMenuItemAction,
  deleteMenuItemAction,
  reorderMenuItemsAction,
} from "@/features/admin/actions/menu";
import AdminPageHeader from "./AdminPageHeader";
import ConfirmDialog from "./ConfirmDialog";

type MenuItem = Row<"menu_items">;

function SortableMenuItem({
  item,
  onEdit,
  onDelete,
}: {
  item: MenuItem;
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
  } = useSortable({ id: item.id });

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
        !item.is_active && "opacity-50",
      )}
    >
      <div
        className="cursor-grab text-neutral-400"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-brand-dark dark:text-white">
          {item.title}
        </p>
        <p className="flex items-center gap-1 text-xs text-neutral-500">
          {item.url}
          {item.open_in_new_tab && (
            <ExternalLink className="h-3 w-3" />
          )}
        </p>
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

interface MenuPageClientProps {
  initialHeaderItems: MenuItem[];
  initialFooterItems: MenuItem[];
}

export default function MenuPageClient({
  initialHeaderItems,
  initialFooterItems,
}: MenuPageClientProps) {
  const [headerItems, setHeaderItems] = useState(initialHeaderItems);
  const [footerItems, setFooterItems] = useState(initialFooterItems);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [_currentPosition, setCurrentPosition] = useState<"header" | "footer">("header");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deletePosition, setDeletePosition] = useState<"header" | "footer">("header");

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
    formState: { errors, isSubmitting },
  } = useForm<MenuItemFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(menuItemSchema) as any,
  });

  function openCreate(position: "header" | "footer") {
    setEditItem(null);
    setCurrentPosition(position);
    const items = position === "header" ? headerItems : footerItems;
    reset({
      parent_id: null,
      position,
      title: "",
      url: "",
      icon: null,
      sort_order: items.length,
      is_active: true,
      open_in_new_tab: false,
    });
    setDialogOpen(true);
  }

  function openEdit(item: MenuItem) {
    setEditItem(item);
    setCurrentPosition(item.position as "header" | "footer");
    reset({
      parent_id: item.parent_id,
      position: item.position as "header" | "footer",
      title: item.title,
      url: item.url,
      icon: item.icon,
      sort_order: item.sort_order,
      is_active: item.is_active,
      open_in_new_tab: item.open_in_new_tab,
    });
    setDialogOpen(true);
  }

  async function onSubmit(data: MenuItemFormData) {
    try {
      if (editItem) {
        await updateMenuItemAction(editItem.id, data);
        toast.success("Пункт обновлён");
      } else {
        await createMenuItemAction(data);
        toast.success("Пункт создан");
      }
      setDialogOpen(false);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения");
    }
  }

  function handleDragEnd(position: "header" | "footer") {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const items = position === "header" ? headerItems : footerItems;
      const setItems = position === "header" ? setHeaderItems : setFooterItems;

      const oldIdx = items.findIndex((i) => i.id === active.id);
      const newIdx = items.findIndex((i) => i.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;

      const reordered = arrayMove(items, oldIdx, newIdx);
      setItems(reordered);

      reorderMenuItemsAction(
        position,
        reordered.map((i) => i.id),
      ).catch(() => toast.error("Ошибка сохранения порядка"));
    };
  }

  async function handleDelete(id: number, position: "header" | "footer") {
    try {
      await deleteMenuItemAction(id);
      if (position === "header") {
        setHeaderItems((prev) => prev.filter((i) => i.id !== id));
      } else {
        setFooterItems((prev) => prev.filter((i) => i.id !== id));
      }
      toast.success("Пункт удалён");
      setDeleteId(null);
    } catch {
      toast.error("Ошибка удаления");
    }
  }

  function renderSection(
    title: string,
    position: "header" | "footer",
    items: MenuItem[],
  ) {
    return (
      <section className="rounded-xl border border-neutral-200 p-5 dark:border-white/10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-dark dark:text-white">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => openCreate(position)}
            className="flex items-center gap-1 rounded-lg bg-brand-orange/10 px-3 py-1.5 text-xs font-medium text-brand-orange hover:bg-brand-orange/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить
          </button>
        </div>

        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">
            Нет пунктов меню
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd(position)}
          >
            <SortableContext
              items={items.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {items.map((item) => (
                  <SortableMenuItem
                    key={item.id}
                    item={item}
                    onEdit={() => openEdit(item)}
                    onDelete={() => {
                      setDeleteId(item.id);
                      setDeletePosition(position);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Меню" />

      <div className="grid gap-6 lg:grid-cols-2">
        {renderSection("Header (шапка)", "header", headerItems)}
        {renderSection("Footer (подвал)", "footer", footerItems)}
      </div>

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
                className="absolute right-4 top-4 text-neutral-400"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="mb-4 text-lg font-semibold text-brand-dark dark:text-white">
                {editItem ? "Редактировать пункт" : "Новый пункт"}
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
                    URL
                  </label>
                  <input
                    {...register("url")}
                    placeholder="/catalog или https://..."
                    className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm dark:border-white/10 dark:text-white"
                  />
                  {errors.url && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.url.message}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <input
                      type="checkbox"
                      {...register("is_active")}
                      className="h-4 w-4 rounded accent-brand-orange"
                    />
                    Активен
                  </label>
                  <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                    <input
                      type="checkbox"
                      {...register("open_in_new_tab")}
                      className="h-4 w-4 rounded accent-brand-orange"
                    />
                    Новая вкладка
                  </label>
                </div>
                <input type="hidden" {...register("position")} />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-orange py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editItem ? "Сохранить" : "Создать"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId, deletePosition)}
        title="Удалить пункт меню?"
        description="Пункт будет удалён безвозвратно."
        confirmText="Удалить"
        variant="danger"
      />
    </div>
  );
}
