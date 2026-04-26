"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useForm, Controller } from "react-hook-form";
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
  Loader2,
  X,
  ImageIcon,
  GripVertical,
  Search,
  Eye,
  EyeOff,
  Star,
  Save,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";

import type { PortfolioItem } from "@/types";
import {
  portfolioItemSchema,
  type PortfolioFormData,
} from "@/features/admin/schemas/portfolio";
import {
  createPortfolioItemAction,
  updatePortfolioItemAction,
  deletePortfolioItemAction,
  reorderPortfolioItemsAction,
  togglePortfolioPublishedAction,
  setFeaturedPortfolioAction,
} from "@/features/admin/actions/portfolio";
import AdminPageHeader from "./AdminPageHeader";
import ConfirmDialog from "./ConfirmDialog";
import ImageUploadField from "./ImageUploadField";

type Tab = "list" | "featured";

const MAX_FEATURED = 3;

interface Props {
  items: PortfolioItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable row для табы «Все работы»
// ─────────────────────────────────────────────────────────────────────────────

function SortableRow({
  item,
  onEdit,
  onDelete,
  onTogglePublished,
  togglingId,
}: {
  item: PortfolioItem;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublished: (next: boolean) => void;
  togglingId: number | null;
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
      )}
    >
      <button
        type="button"
        className="cursor-grab text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        aria-label="Перетащить"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-white/10">
        {item.cover_url ? (
          <Image
            src={item.cover_url}
            alt=""
            fill
            className="object-cover"
            sizes="64px"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-4 w-4 text-neutral-300" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-brand-dark dark:text-white">
            {item.title}
          </p>
          {item.is_featured && (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-brand-orange/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-orange"
              title={`Главная #${item.featured_order ?? "?"}`}
            >
              <Star className="h-2.5 w-2.5 fill-current" />
              {item.featured_order ?? "★"}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          <span className="font-mono opacity-70">/{item.slug}</span>
          {item.client_name && ` · ${item.client_name}`}
          {item.location && ` · ${item.location}`}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onTogglePublished(!item.is_published)}
          disabled={togglingId === item.id}
          className={clsx(
            "flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors",
            item.is_published
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-400",
          )}
          title={item.is_published ? "Снять с публикации" : "Опубликовать"}
        >
          {togglingId === item.id ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : item.is_published ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
          {item.is_published ? "Опубл." : "Черновик"}
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-brand-orange dark:hover:bg-white/10"
          aria-label="Редактировать"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
          aria-label="Удалить"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Главный компонент
// ─────────────────────────────────────────────────────────────────────────────

export default function PortfolioPageClient({ items: initialItems }: Props) {
  const [tab, setTab] = useState<Tab>("list");
  const [items, setItems] = useState<PortfolioItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  const [editItem, setEditItem] = useState<PortfolioItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) {
      if (i.category_label) set.add(i.category_label);
    }
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (filterCategory && i.category_label !== filterCategory) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.slug.toLowerCase().includes(q) ||
        (i.client_name ?? "").toLowerCase().includes(q) ||
        (i.industry ?? "").toLowerCase().includes(q) ||
        (i.location ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, search, filterCategory]);

  function openCreate() {
    setEditItem(null);
    setDialogOpen(true);
  }

  function openEdit(item: PortfolioItem) {
    setEditItem(item);
    setDialogOpen(true);
  }

  async function handleTogglePublished(item: PortfolioItem, next: boolean) {
    setTogglingId(item.id);
    const res = await togglePortfolioPublishedAction(item.id, next);
    setTogglingId(null);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось обновить");
      return;
    }
    setItems((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, is_published: next } : p,
      ),
    );
    toast.success(next ? "Опубликовано" : "Снято с публикации");
  }

  async function handleDelete(id: number) {
    const res = await deletePortfolioItemAction(id);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось удалить");
      setDeleteId(null);
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== id));
    setDeleteId(null);
    toast.success("Работа удалена");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Drag работает только в нефильтрованной выдаче.
    // Для фильтрованной — просто игнорируем (UI кнопка drag заблокирована визуально не будет, но всё равно безопасно).
    const ids = filtered.map((i) => i.id);
    const oldIdx = ids.indexOf(active.id as number);
    const newIdx = ids.indexOf(over.id as number);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(filtered, oldIdx, newIdx);

    // Применяем порядок только к видимым элементам, остальные оставляем как есть.
    // Назначаем sort_order = индекс*10 (с шагом, чтобы оставить место для вставок).
    const updates = reordered.map((it, idx) => ({
      id: it.id,
      sort_order: idx * 10,
    }));

    // Optimistic UI
    setItems((prev) => {
      const map = new Map(prev.map((i) => [i.id, i]));
      for (const u of updates) {
        const existing = map.get(u.id);
        if (existing) map.set(u.id, { ...existing, sort_order: u.sort_order });
      }
      return Array.from(map.values()).sort(
        (a, b) =>
          Number(b.is_published) - Number(a.is_published) ||
          a.sort_order - b.sort_order ||
          b.id - a.id,
      );
    });

    startTransition(async () => {
      const res = await reorderPortfolioItemsAction(updates);
      if (!res.ok) {
        toast.error(res.error ?? "Не удалось сохранить порядок");
      }
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Портфолио"
        description={`${items.length} ${pluralize(items.length, ["работа", "работы", "работ"])}`}
        actions={
          tab === "list" ? (
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover"
            >
              <Plus className="h-4 w-4" />
              Добавить работу
            </button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-white/10">
        <TabButton
          active={tab === "list"}
          onClick={() => setTab("list")}
          icon={<ImageIcon className="h-4 w-4" />}
          label="Все работы"
        />
        <TabButton
          active={tab === "featured"}
          onClick={() => setTab("featured")}
          icon={<Star className="h-4 w-4" />}
          label="Главные на главной"
          badge={items.filter((i) => i.is_featured).length}
        />
      </div>

      {tab === "list" ? (
        <ListTab
          items={items}
          filtered={filtered}
          search={search}
          setSearch={setSearch}
          categoryOptions={categoryOptions}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          sensors={sensors}
          onDragEnd={handleDragEnd}
          openEdit={openEdit}
          setDeleteId={setDeleteId}
          handleTogglePublished={handleTogglePublished}
          togglingId={togglingId}
        />
      ) : (
        <FeaturedTab items={items} setItems={setItems} />
      )}

      {/* Form dialog */}
      <PortfolioFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editItem={editItem}
        onSaved={(saved) => {
          setItems((prev) => {
            const exists = prev.some((p) => p.id === saved.id);
            if (exists) {
              return prev.map((p) => (p.id === saved.id ? saved : p));
            }
            return [saved, ...prev];
          });
          setDialogOpen(false);
        }}
      />

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Удалить работу из портфолио?"
        description="Запись удалится безвозвратно. Файлы изображений в хранилище НЕ удаляются автоматически."
        confirmText="Удалить"
        variant="danger"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: List
// ─────────────────────────────────────────────────────────────────────────────

interface ListTabProps {
  items: PortfolioItem[];
  filtered: PortfolioItem[];
  search: string;
  setSearch: (v: string) => void;
  categoryOptions: string[];
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (e: DragEndEvent) => void;
  openEdit: (item: PortfolioItem) => void;
  setDeleteId: (id: number) => void;
  handleTogglePublished: (item: PortfolioItem, next: boolean) => void;
  togglingId: number | null;
}

function ListTab(props: ListTabProps) {
  const {
    items,
    filtered,
    search,
    setSearch,
    categoryOptions,
    filterCategory,
    setFilterCategory,
    sensors,
    onDragEnd,
    openEdit,
    setDeleteId,
    handleTogglePublished,
    togglingId,
  } = props;

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию, slug, клиенту, городу"
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>
        {categoryOptions.length > 0 && (
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="">Все категории</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <span className="ml-auto text-xs text-neutral-500">
          Показано: {filtered.length} из {items.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-12 text-center dark:border-white/10 dark:bg-white/[0.02]">
          <ImageIcon className="mx-auto h-8 w-8 text-neutral-300" />
          <p className="mt-3 text-sm text-neutral-500">
            {items.length === 0
              ? "Работы ещё не добавлены"
              : "Под фильтр ничего не подходит"}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={filtered.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {filtered.map((item) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  onEdit={() => openEdit(item)}
                  onDelete={() => setDeleteId(item.id)}
                  onTogglePublished={(next) =>
                    handleTogglePublished(item, next)
                  }
                  togglingId={togglingId}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab: Featured (адаптация старого экрана)
// ─────────────────────────────────────────────────────────────────────────────

function FeaturedTab({
  items,
  setItems,
}: {
  items: PortfolioItem[];
  setItems: React.Dispatch<React.SetStateAction<PortfolioItem[]>>;
}) {
  const initialFeatured = useMemo(
    () =>
      items
        .filter((i) => i.is_featured)
        .sort((a, b) => {
          const ao = a.featured_order ?? Number.MAX_SAFE_INTEGER;
          const bo = b.featured_order ?? Number.MAX_SAFE_INTEGER;
          return ao - bo;
        })
        .map((i) => i.id),
    [items],
  );
  const [selected, setSelected] = useState<number[]>(initialFeatured);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.client_name ?? "").toLowerCase().includes(q) ||
        (i.industry ?? "").toLowerCase().includes(q) ||
        (i.location ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  function toggle(id: number, isPublished: boolean) {
    if (!isPublished) {
      toast.error("Сначала опубликуйте работу");
      return;
    }
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= MAX_FEATURED) {
        toast.error(`Можно выбрать только ${MAX_FEATURED} главные работы`);
        return prev;
      }
      return [...prev, id];
    });
  }

  function moveUp(id: number) {
    setSelected((prev) => {
      const i = prev.indexOf(id);
      if (i <= 0) return prev;
      const next = [...prev];
      [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
      return next;
    });
  }

  function moveDown(id: number) {
    setSelected((prev) => {
      const i = prev.indexOf(id);
      if (i === -1 || i === prev.length - 1) return prev;
      const next = [...prev];
      [next[i + 1], next[i]] = [next[i]!, next[i + 1]!];
      return next;
    });
  }

  const dirty = useMemo(() => {
    if (selected.length !== initialFeatured.length) return true;
    return selected.some((id, idx) => initialFeatured[idx] !== id);
  }, [selected, initialFeatured]);

  async function handleSave() {
    setSaving(true);
    const res = await setFeaturedPortfolioAction({ ids: selected });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось сохранить");
      return;
    }
    toast.success("Главные работы обновлены");
    // Обновляем локальный стейт, чтобы featured-бейджи сразу отрисовались на табе «Все работы».
    setItems((prev) =>
      prev.map((p) => {
        const idx = selected.indexOf(p.id);
        if (idx >= 0) {
          return { ...p, is_featured: true, featured_order: idx + 1 };
        }
        return { ...p, is_featured: false, featured_order: null };
      }),
    );
  }

  const selectedItems = useMemo(() => {
    const map = new Map(items.map((i) => [i.id, i]));
    return selected
      .map((id) => map.get(id))
      .filter((x): x is PortfolioItem => Boolean(x));
  }, [items, selected]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-500/20 dark:bg-blue-500/5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-xs text-blue-900 dark:text-blue-200">
            <p className="font-medium">
              Выберите до {MAX_FEATURED} работ для блока «Наши работы» на главной.
            </p>
            <p className="text-blue-800/80 dark:text-blue-200/70">
              Порядок в списке = порядок на главной.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Сохранить ({selected.length}/{MAX_FEATURED})
        </button>
      </div>

      {selectedItems.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-dark dark:text-white">
            <Star className="h-4 w-4 fill-brand-orange text-brand-orange" />
            Порядок на главной
          </h3>
          <div className="flex flex-wrap gap-3">
            {selectedItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex w-full items-center gap-3 rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-3 sm:w-auto sm:flex-1 sm:min-w-[260px]"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-white">
                  {idx + 1}
                </div>
                <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  {item.cover_url ? (
                    <Image
                      src={item.cover_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-4 w-4 text-neutral-300" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-brand-dark dark:text-white">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {item.client_name ?? item.industry ?? item.location ?? "—"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveUp(item.id)}
                    disabled={idx === 0}
                    className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-white disabled:opacity-30 dark:hover:bg-white/10"
                    aria-label="Вверх"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDown(item.id)}
                    disabled={idx === selectedItems.length - 1}
                    className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-white disabled:opacity-30 dark:hover:bg-white/10"
                    aria-label="Вниз"
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию, клиенту, городу"
          className="h-10 w-full rounded-lg border border-neutral-200 bg-white pl-10 pr-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-500">
          Работы не найдены
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const checked = selected.includes(item.id);
            const idx = selected.indexOf(item.id);
            const blocked = !item.is_published && !checked;

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => toggle(item.id, item.is_published)}
                disabled={blocked && selected.length >= MAX_FEATURED}
                className={clsx(
                  "group relative overflow-hidden rounded-2xl border bg-white text-left transition-all dark:bg-neutral-900",
                  checked
                    ? "border-brand-orange shadow-md ring-2 ring-brand-orange/20"
                    : "border-neutral-200 hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/20",
                  !item.is_published && "opacity-60",
                )}
              >
                <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-white/5">
                  {item.cover_url ? (
                    <Image
                      src={item.cover_url}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-neutral-300" />
                    </div>
                  )}

                  {checked && (
                    <div className="absolute left-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-white shadow-md">
                      {idx + 1}
                    </div>
                  )}

                  {!item.is_published && (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
                      <EyeOff className="h-3 w-3" />
                      Черновик
                    </span>
                  )}
                </div>

                <div className="p-3.5">
                  <p className="truncate text-sm font-semibold text-brand-dark dark:text-white">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {item.client_name ?? item.industry ?? item.location ?? "—"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Dialog (Create / Edit)
// ─────────────────────────────────────────────────────────────────────────────

interface PortfolioFormDialogProps {
  open: boolean;
  onClose: () => void;
  editItem: PortfolioItem | null;
  onSaved: (saved: PortfolioItem) => void;
}

function PortfolioFormDialog({
  open,
  onClose,
  editItem,
  onSaved,
}: PortfolioFormDialogProps) {
  const defaultValues: PortfolioFormData = useMemo(() => {
    if (editItem) {
      return {
        title: editItem.title,
        slug: editItem.slug,
        description: editItem.description,
        short_description: editItem.short_description,
        category_id: editItem.category_id,
        category_label: editItem.category_label,
        related_product_id: editItem.related_product_id,
        client_name: editItem.client_name,
        industry: editItem.industry,
        location: editItem.location,
        year: editItem.year,
        project_date: editItem.project_date,
        cover_url: editItem.cover_url,
        images: editItem.images ?? [],
        video_url: editItem.video_url,
        is_published: editItem.is_published,
        sort_order: editItem.sort_order,
        seo_title: editItem.seo_title,
        seo_description: editItem.seo_description,
        published_at: editItem.published_at,
      };
    }
    return {
      title: "",
      slug: "",
      description: null,
      short_description: null,
      category_id: null,
      category_label: null,
      related_product_id: null,
      client_name: null,
      industry: null,
      location: null,
      year: new Date().getFullYear(),
      project_date: null,
      cover_url: "",
      images: [],
      video_url: null,
      is_published: true,
      sort_order: 0,
      seo_title: null,
      seo_description: null,
      published_at: null,
    };
  }, [editItem]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PortfolioFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(portfolioItemSchema) as any,
    values: defaultValues,
  });

  const cover = watch("cover_url");
  const images = watch("images") ?? [];
  const slugValue = watch("slug");
  const titleValue = watch("title");

  function autoSlug() {
    if (!titleValue) return;
    const next = slugify(titleValue);
    if (next) setValue("slug", next, { shouldValidate: true });
  }

  function addImage(url: string | null) {
    if (!url) return;
    setValue("images", [...images, url], { shouldValidate: true });
  }

  function removeImage(idx: number) {
    setValue(
      "images",
      images.filter((_, i) => i !== idx),
      { shouldValidate: true },
    );
  }

  function moveImage(idx: number, dir: -1 | 1) {
    const next = [...images];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target]!, next[idx]!];
    setValue("images", next, { shouldValidate: true });
  }

  async function onSubmit(data: PortfolioFormData) {
    const payload = data;
    const res = editItem
      ? await updatePortfolioItemAction(editItem.id, payload)
      : await createPortfolioItemAction(payload);

    if (!res.ok) {
      toast.error(res.error ?? "Ошибка сохранения");
      return;
    }

    toast.success(editItem ? "Работа обновлена" : "Работа создана");

    const savedId =
      editItem?.id ??
      (res.data && typeof res.data === "object" && "id" in res.data
        ? (res.data as { id: number }).id
        : 0);

    const saved: PortfolioItem = {
      ...(editItem ?? makeEmptyPortfolioRow(savedId)),
      ...payload,
      id: savedId,
      is_featured: editItem?.is_featured ?? false,
      featured_order: editItem?.featured_order ?? null,
      views_count: editItem?.views_count ?? 0,
      search_vector: editItem?.search_vector ?? null,
      created_at: editItem?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onSaved(saved);
    reset();
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            className="relative my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-neutral-900"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="mb-1 text-lg font-semibold text-brand-dark dark:text-white">
              {editItem ? "Редактировать работу" : "Новая работа"}
            </h3>
            <p className="mb-5 text-xs text-neutral-500">
              Изменения появятся на витрине после revalidate (~60 сек или
              сразу после сохранения).
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Title + Slug */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Название" error={errors.title?.message}>
                  <input
                    {...register("title")}
                    className={inputCls}
                    placeholder="Крышная вывеска ВТБ"
                  />
                </Field>
                <Field label="Slug" error={errors.slug?.message}>
                  <div className="flex gap-2">
                    <input
                      {...register("slug")}
                      className={inputCls}
                      placeholder="vtb-roof-sign"
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
                  <p className="mt-1 text-[11px] text-neutral-400 font-mono">
                    /portfolio/{slugValue || "..."}
                  </p>
                </Field>
              </div>

              {/* Cover */}
              <Field
                label="Обложка"
                error={errors.cover_url?.message}
              >
                <Controller
                  control={control}
                  name="cover_url"
                  render={({ field }) => (
                    <ImageUploadField
                      value={field.value}
                      onChange={(url) => field.onChange(url ?? "")}
                      pathPrefix="portfolio"
                      previewAspect="video"
                      hint="Главное изображение для карточки. JPG/PNG/WebP до 5 МБ"
                    />
                  )}
                />
                {cover && (
                  <p className="mt-1 truncate text-[11px] text-neutral-400 font-mono">
                    {cover}
                  </p>
                )}
              </Field>

              {/* Gallery */}
              <Field label="Галерея">
                <div className="space-y-2">
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {images.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 dark:border-white/10"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-end justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <div className="flex gap-0.5">
                              <button
                                type="button"
                                onClick={() => moveImage(idx, -1)}
                                disabled={idx === 0}
                                className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-neutral-700 disabled:opacity-30"
                                title="Влево"
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                onClick={() => moveImage(idx, 1)}
                                disabled={idx === images.length - 1}
                                className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-neutral-700 disabled:opacity-30"
                                title="Вправо"
                              >
                                →
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-medium text-white"
                              title="Удалить"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <ImageUploadField
                    key={`gallery-add-${images.length}`}
                    value={null}
                    onChange={(url) => addImage(url)}
                    pathPrefix="portfolio"
                    previewAspect="square"
                    hint="Добавить ещё одно фото в галерею"
                  />
                </div>
              </Field>

              {/* Meta */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Клиент">
                  <input
                    {...register("client_name")}
                    className={inputCls}
                    placeholder="ВТБ"
                  />
                </Field>
                <Field label="Категория (label)">
                  <input
                    {...register("category_label")}
                    className={inputCls}
                    placeholder="Наружная реклама"
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Отрасль">
                  <input
                    {...register("industry")}
                    className={inputCls}
                    placeholder="Банки"
                  />
                </Field>
                <Field label="Город">
                  <input
                    {...register("location")}
                    className={inputCls}
                    placeholder="Ханты-Мансийск"
                  />
                </Field>
                <Field label="Год" error={errors.year?.message}>
                  <input
                    type="number"
                    {...register("year", {
                      setValueAs: (v) =>
                        v === "" || v === null ? null : Number(v),
                    })}
                    className={inputCls}
                    placeholder="2024"
                  />
                </Field>
              </div>

              {/* Description */}
              <Field
                label="Краткое описание"
                error={errors.short_description?.message}
              >
                <textarea
                  {...register("short_description")}
                  rows={2}
                  className={textareaCls}
                  placeholder="1–2 предложения для карточки"
                />
              </Field>
              <Field
                label="Полное описание"
                error={errors.description?.message}
              >
                <textarea
                  {...register("description")}
                  rows={5}
                  className={textareaCls}
                  placeholder="Детали проекта: задача, материалы, сроки"
                />
              </Field>

              {/* Video */}
              <Field label="Видео (URL)">
                <input
                  {...register("video_url")}
                  className={inputCls}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </Field>

              {/* SEO */}
              <details className="rounded-lg border border-neutral-200 p-3 dark:border-white/10">
                <summary className="cursor-pointer text-sm font-medium text-brand-dark dark:text-white">
                  SEO
                </summary>
                <div className="mt-3 space-y-3">
                  <Field label="SEO Title">
                    <input
                      {...register("seo_title")}
                      className={inputCls}
                      placeholder="до 60 символов"
                    />
                  </Field>
                  <Field label="SEO Description">
                    <textarea
                      {...register("seo_description")}
                      rows={2}
                      className={textareaCls}
                      placeholder="до 160 символов"
                    />
                  </Field>
                </div>
              </details>

              {/* Status row */}
              <div className="flex items-center justify-between gap-4 rounded-lg bg-neutral-50 px-3 py-2.5 dark:bg-white/5">
                <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <input
                    type="checkbox"
                    {...register("is_published")}
                    className="h-4 w-4 rounded accent-brand-orange"
                  />
                  Опубликовать
                </label>
                <Field
                  label=""
                  className="!mb-0 flex items-center gap-2"
                  error={errors.sort_order?.message}
                >
                  <span className="text-xs text-neutral-500">sort_order</span>
                  <input
                    type="number"
                    {...register("sort_order", {
                      setValueAs: (v) => (v === "" ? 0 : Number(v)),
                    })}
                    className="h-9 w-20 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-700 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-3 pt-2">
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
                  className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-hover disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editItem ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini-components / helpers
// ─────────────────────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "text-brand-orange"
          : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
      )}
    >
      {icon}
      {label}
      {typeof badge === "number" && (
        <span
          className={clsx(
            "ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
            active
              ? "bg-brand-orange text-white"
              : "bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-300",
          )}
        >
          {badge}
        </span>
      )}
      {active && (
        <motion.span
          layoutId="portfolio-tab-underline"
          className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-orange"
        />
      )}
    </button>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-1", className)}>
      {label && (
        <label className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400">
          {label}
        </label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm text-brand-dark placeholder:text-neutral-400 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:bg-white/5 dark:text-white";

const textareaCls =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-brand-dark placeholder:text-neutral-400 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:bg-white/5 dark:text-white";

function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
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
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

// Placeholder для свежесозданного объекта (когда отвечает только { id }).
function makeEmptyPortfolioRow(id: number): PortfolioItem {
  return {
    id,
    title: "",
    slug: "",
    description: null,
    short_description: null,
    category_id: null,
    related_product_id: null,
    client_name: null,
    industry: null,
    location: null,
    year: null,
    project_date: null,
    cover_url: "",
    images: [],
    video_url: null,
    is_featured: false,
    featured_order: null,
    is_published: true,
    sort_order: 0,
    seo_title: null,
    seo_description: null,
    views_count: 0,
    search_vector: null,
    published_at: null,
    category_label: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

