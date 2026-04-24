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
  rectSortingStrategy,
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
  ImageIcon,
  UserSquare2,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";

import {
  teamMemberSchema,
  type TeamMemberFormData,
} from "@/features/admin/schemas/team";
import {
  createTeamMemberAction,
  updateTeamMemberAction,
  deleteTeamMemberAction,
  reorderTeamMembersAction,
} from "@/features/admin/actions/team";
import type { TeamMember } from "@/types";
import AdminPageHeader from "./AdminPageHeader";
import ConfirmDialog from "./ConfirmDialog";

interface TeamPageClientProps {
  initialMembers: TeamMember[];
}

export default function TeamPageClient({ initialMembers }: TeamPageClientProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(m: TeamMember) {
    setEditing(m);
    setDialogOpen(true);
  }

  async function handleDelete(id: number) {
    setDeleting(true);
    const res = await deleteTeamMemberAction(id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось удалить");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setDeleteId(null);
    toast.success("Сотрудник удалён");
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = members.findIndex((m) => m.id === active.id);
    const newIdx = members.findIndex((m) => m.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(members, oldIdx, newIdx);
    setMembers(reordered);

    const res = await reorderTeamMembersAction({
      ids: reordered.map((m) => m.id),
    });
    if (!res.ok) {
      toast.error(res.error ?? "Ошибка сохранения порядка");
      // откатываем
      setMembers(members);
    }
  }

  function handleSaved(saved: TeamMember, isCreate: boolean) {
    setMembers((prev) =>
      isCreate
        ? [...prev, saved]
        : prev.map((m) => (m.id === saved.id ? saved : m)),
    );
    setDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Команда"
        description={`${members.length} ${members.length === 1 ? "сотрудник" : "сотрудников"} · Перетаскивайте, чтобы изменить порядок`}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
          >
            <Plus className="h-4 w-4" />
            Добавить
          </button>
        }
      />

      {members.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 py-20 text-center dark:border-white/10">
          <UserSquare2 className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm text-neutral-500">Сотрудники ещё не добавлены</p>
          <button
            type="button"
            onClick={openCreate}
            className="text-sm font-semibold text-brand-orange hover:underline"
          >
            Добавить первого
          </button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={members.map((m) => m.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {members.map((m) => (
                <SortableMember
                  key={m.id}
                  member={m}
                  onEdit={() => openEdit(m)}
                  onDelete={() => setDeleteId(m.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <AnimatePresence>
        {dialogOpen && (
          <TeamMemberDialog
            member={editing}
            existingCount={members.length}
            onClose={() => setDialogOpen(false)}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Удалить сотрудника?"
        description="Карточка и фото будут удалены. Действие необратимо."
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

function SortableMember({
  member,
  onEdit,
  onDelete,
}: {
  member: TeamMember;
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
  } = useSortable({ id: member.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        "group relative overflow-hidden rounded-2xl border bg-white transition-all dark:bg-neutral-900",
        isDragging
          ? "z-10 border-brand-orange shadow-xl"
          : "border-neutral-200 hover:border-neutral-300 dark:border-white/10 dark:hover:border-white/20",
        !member.is_active && "opacity-60",
      )}
    >
      <div className="relative aspect-[4/5] bg-neutral-100 dark:bg-white/5">
        {member.photo_url ? (
          <Image
            src={member.photo_url}
            alt={member.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <UserSquare2 className="h-16 w-16 text-neutral-300 dark:text-neutral-700" />
          </div>
        )}

        {!member.is_active && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-white backdrop-blur-sm">
            <EyeOff className="h-3 w-3" />
            Скрыт
          </span>
        )}

        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Перетащить"
          className="absolute right-3 top-3 inline-flex h-8 w-8 cursor-grab items-center justify-center rounded-md bg-black/50 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 group-hover:opacity-100"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/90 text-neutral-700 transition-colors hover:bg-white"
            aria-label="Редактировать"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-500 text-white transition-colors hover:bg-red-600"
            aria-label="Удалить"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <p className="truncate text-sm font-semibold text-brand-dark dark:text-white">
          {member.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">{member.role}</p>
      </div>
    </div>
  );
}

function TeamMemberDialog({
  member,
  existingCount,
  onClose,
  onSaved,
}: {
  member: TeamMember | null;
  existingCount: number;
  onClose: () => void;
  onSaved: (m: TeamMember, isCreate: boolean) => void;
}) {
  const isEdit = !!member;
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TeamMemberFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(teamMemberSchema) as any,
    defaultValues: {
      name: member?.name ?? "",
      role: member?.role ?? "",
      photo_url: member?.photo_url ?? null,
      bio: member?.bio ?? null,
      sort_order: member?.sort_order ?? existingCount,
      is_active: member?.is_active ?? true,
    },
  });

  const photoUrl = watch("photo_url");

  async function handleUpload(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("bucket", "images");
    fd.append("path", "uploads");
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        toast.error("Ошибка загрузки фото");
        return;
      }
      const { url } = await res.json();
      setValue("photo_url", url, { shouldValidate: true });
    } catch {
      toast.error("Ошибка загрузки фото");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(data: TeamMemberFormData) {
    if (isEdit && member) {
      const res = await updateTeamMemberAction(member.id, data);
      if (!res.ok) {
        toast.error(res.error ?? "Ошибка сохранения");
        return;
      }
      toast.success("Сотрудник обновлён");
      onSaved(
        {
          ...member,
          name: data.name,
          role: data.role,
          photo_url: data.photo_url ?? null,
          bio: data.bio ?? null,
          sort_order: data.sort_order,
          is_active: data.is_active,
        },
        false,
      );
    } else {
      const res = await createTeamMemberAction(data);
      if (!res.ok) {
        toast.error(res.error ?? "Ошибка сохранения");
        return;
      }
      toast.success("Сотрудник добавлен");
      const fakeRow: TeamMember = {
        id: res.id ?? Date.now(),
        name: data.name,
        role: data.role,
        photo_url: data.photo_url ?? null,
        bio: data.bio ?? null,
        sort_order: data.sort_order,
        is_active: data.is_active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onSaved(fakeRow, true);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto p-4"
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
        className="relative my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-neutral-900"
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
          {isEdit ? "Редактировать сотрудника" : "Новый сотрудник"}
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          Карточка отображается в блоке «Команда» на странице «О компании»
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-5 grid gap-5 sm:grid-cols-[200px_1fr]"
        >
          {/* Photo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
              Фото *
            </label>
            {photoUrl ? (
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-neutral-200 dark:border-white/10">
                <Image
                  src={photoUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="200px"
                />
                <button
                  type="button"
                  onClick={() => setValue("photo_url", null)}
                  className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-md"
                  aria-label="Удалить фото"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50 transition-colors hover:border-brand-orange/50 hover:bg-brand-orange/5 dark:border-white/10 dark:bg-white/[0.02]">
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
                  <Loader2 className="h-7 w-7 animate-spin text-brand-orange" />
                ) : (
                  <ImageIcon className="h-7 w-7 text-neutral-400" />
                )}
                <span className="px-3 text-center text-xs text-neutral-500">
                  Загрузить фото<br />
                  (вертикальное 4:5)
                </span>
              </label>
            )}
            {errors.photo_url && (
              <p className="mt-1 text-xs text-red-500">
                {errors.photo_url.message}
              </p>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                Имя и фамилия *
              </label>
              <input
                {...register("name")}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white"
                placeholder="Иванов Иван"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                Должность *
              </label>
              <input
                {...register("role")}
                className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white"
                placeholder="Менеджер по работе с клиентами"
              />
              {errors.role && (
                <p className="mt-1 text-xs text-red-500">{errors.role.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                Краткое био
              </label>
              <textarea
                {...register("bio")}
                rows={4}
                className="w-full rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm leading-relaxed focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white"
                placeholder="Несколько строк о сотруднике (опционально)"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-brand-dark dark:text-neutral-200">
              <input
                type="checkbox"
                {...register("is_active")}
                className="h-4 w-4 rounded accent-brand-orange"
              />
              Показывать на сайте
            </label>

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
                disabled={isSubmitting || uploading}
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
