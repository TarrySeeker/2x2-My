"use client";

import { useCallback, useEffect, useState } from "react";
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
  FolderTree,
  Plus,
  Edit3,
  Trash2,
  ChevronRight,
  GripVertical,
  FolderPlus,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import type { CategoryTreeNode } from "@/features/admin/types";
import {
  fetchCategoriesTreeAction,
  deleteCategoryAction,
  reorderCategoriesAction,
} from "@/features/admin/actions/categories";
import AdminPageHeader from "./AdminPageHeader";
import StatusBadge from "./StatusBadge";
import ConfirmDialog from "./ConfirmDialog";

interface CategoriesPageClientProps {
  onEdit: (id: number) => void;
  onAdd: (parentId?: number) => void;
}

function SortableCategoryRow({
  node,
  depth,
  onEdit,
  onAdd,
  onDelete,
}: {
  node: CategoryTreeNode;
  depth: number;
  onEdit: (id: number) => void;
  onAdd: (parentId: number) => void;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={clsx(
          "flex items-center gap-2 rounded-lg border px-4 py-3 transition-colors",
          "bg-white dark:bg-white/[0.02]",
          isDragging
            ? "z-10 border-brand-orange shadow-lg"
            : "border-neutral-200 dark:border-white/10",
        )}
      >
        {/* Indent */}
        {depth > 0 && (
          <div style={{ width: depth * 24 }} className="shrink-0" />
        )}

        {/* Drag handle */}
        <div
          className="cursor-grab text-neutral-300 hover:text-neutral-500 dark:text-neutral-600"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Expand toggle */}
        {node.children.length > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-neutral-400 transition-transform"
          >
            <ChevronRight
              className={clsx(
                "h-4 w-4 transition-transform",
                expanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Name */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 shrink-0 text-brand-orange" />
            <span className="truncate font-medium text-brand-dark dark:text-neutral-200">
              {node.name}
            </span>
            <span className="text-xs text-neutral-400">/{node.slug}</span>
          </div>
        </div>

        {/* Count + Status */}
        {/* product_count not in schema — reserved for future */}
        <StatusBadge status={node.is_active ? "active" : "archived"} />

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(node.id)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10"
            title="Редактировать"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAdd(node.id)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10"
            title="Добавить подкатегорию"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(node.id)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
            title="Удалить"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded &&
        node.children.map((child) => (
          <SortableCategoryRow
            key={child.id}
            node={child}
            depth={depth + 1}
            onEdit={onEdit}
            onAdd={onAdd}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}

export default function CategoriesPageClient({
  onEdit,
  onAdd,
}: CategoriesPageClientProps) {
  const [tree, setTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCategoriesTreeAction();
      setTree(data);
    } catch {
      toast.error("Ошибка загрузки категорий");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Flatten tree for SortableContext ids
  function flattenIds(nodes: CategoryTreeNode[]): number[] {
    const ids: number[] = [];
    for (const node of nodes) {
      ids.push(node.id);
      ids.push(...flattenIds(node.children));
    }
    return ids;
  }

  // Flatten tree for reorder (preserving parent relationships)
  function flattenForReorder(
    nodes: CategoryTreeNode[],
    parentId: number | null = null,
  ): { id: number; sort_order: number; parent_id: number | null }[] {
    const result: { id: number; sort_order: number; parent_id: number | null }[] = [];
    nodes.forEach((node, i) => {
      result.push({ id: node.id, sort_order: i, parent_id: parentId });
      result.push(...flattenForReorder(node.children, node.id));
    });
    return result;
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Simple reorder within roots only for now
    const oldIdx = tree.findIndex((n) => n.id === active.id);
    const newIdx = tree.findIndex((n) => n.id === over.id);

    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(tree, oldIdx, newIdx);
    setTree(reordered);

    try {
      const items = flattenForReorder(reordered);
      await reorderCategoriesAction(items);
    } catch {
      toast.error("Ошибка сохранения порядка");
      fetchTree();
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCategoryAction(id);
      toast.success("Категория удалена");
      setDeleteId(null);
      fetchTree();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Ошибка удаления категории",
      );
    }
  }

  const allIds = flattenIds(tree);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Категории"
        description={`${allIds.length} категорий`}
        actions={
          <button
            type="button"
            onClick={() => onAdd()}
            className="flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
          >
            <Plus className="h-4 w-4" />
            Добавить категорию
          </button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-orange border-t-transparent" />
        </div>
      ) : tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <FolderTree className="mb-4 h-12 w-12" />
          <p className="text-lg font-medium">Категорий пока нет</p>
          <p className="text-sm">Создайте первую категорию</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={allIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {tree.map((node) => (
                <SortableCategoryRow
                  key={node.id}
                  node={node}
                  depth={0}
                  onEdit={onEdit}
                  onAdd={(parentId) => onAdd(parentId)}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Удалить категорию?"
        description="Убедитесь, что в категории нет товаров и подкатегорий."
        confirmText="Удалить"
        variant="danger"
      />
    </div>
  );
}
