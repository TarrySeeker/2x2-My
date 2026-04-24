"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Sparkles,
  CalendarRange,
  Loader2,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";

import type { Promotion } from "@/types";
import {
  deletePromotionAction,
  togglePromotionPopupAction,
  updatePromotionAction,
} from "@/features/admin/actions/promotions";
import AdminPageHeader from "./AdminPageHeader";
import ConfirmDialog from "./ConfirmDialog";

interface Props {
  initialItems: Promotion[];
}

function formatRange(item: Promotion): string {
  const fmt = (raw: string | null): string | null => {
    if (!raw) return null;
    try {
      return new Date(raw).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    } catch {
      return raw;
    }
  };
  const from = fmt(item.valid_from);
  const to = fmt(item.valid_to);
  if (!from && !to) return "Без ограничений";
  if (from && to) return `${from} – ${to}`;
  if (from) return `с ${from}`;
  return `до ${to}`;
}

export default function PromotionsPageClient({ initialItems }: Props) {
  const [items, setItems] = useState<Promotion[]>(initialItems);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingPopupId, setTogglingPopupId] = useState<number | null>(null);
  const [togglingActiveId, setTogglingActiveId] = useState<number | null>(null);

  const popupCount = useMemo(
    () => items.filter((p) => p.show_as_popup && p.is_active).length,
    [items],
  );

  async function handleDelete(id: number) {
    setDeleting(true);
    const res = await deletePromotionAction(id);
    setDeleting(false);
    if (!res.ok) {
      toast.error(res.error ?? "Не удалось удалить");
      return;
    }
    setItems((prev) => prev.filter((p) => p.id !== id));
    setDeleteId(null);
    toast.success("Акция удалена");
  }

  async function handleTogglePopup(item: Promotion) {
    setTogglingPopupId(item.id);
    const next = !item.show_as_popup;
    const res = await togglePromotionPopupAction(item.id, {
      show_as_popup: next,
    });
    setTogglingPopupId(null);
    if (!res.ok) {
      toast.error(res.error ?? "Ошибка");
      return;
    }
    setItems((prev) =>
      prev.map((p) => (p.id === item.id ? { ...p, show_as_popup: next } : p)),
    );
    toast.success(next ? "Будет показано в попапе" : "Снято с попапа");
  }

  async function handleToggleActive(item: Promotion) {
    setTogglingActiveId(item.id);
    const res = await updatePromotionAction(item.id, {
      title: item.title,
      body: item.body,
      image_url: item.image_url,
      link_url: item.link_url,
      link_text: item.link_text,
      valid_from: item.valid_from,
      valid_to: item.valid_to,
      is_active: !item.is_active,
      show_as_popup: item.show_as_popup,
      sort_order: item.sort_order,
    });
    setTogglingActiveId(null);
    if (!res.ok) {
      toast.error(res.error ?? "Ошибка");
      return;
    }
    setItems((prev) =>
      prev.map((p) =>
        p.id === item.id ? { ...p, is_active: !p.is_active } : p,
      ),
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Акции"
        description={`${items.length} ${items.length === 1 ? "акция" : "акций"} · в попапе сейчас: ${popupCount}`}
        actions={
          <Link
            href="/admin/content/promotions/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
          >
            <Plus className="h-4 w-4" />
            Создать
          </Link>
        }
      />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-neutral-200 py-20 text-center dark:border-white/10">
          <Megaphone className="h-12 w-12 text-neutral-300 dark:text-neutral-600" />
          <p className="text-sm text-neutral-500">Акций пока нет</p>
          <Link
            href="/admin/content/promotions/new"
            className="text-sm font-semibold text-brand-orange hover:underline"
          >
            Создать первую акцию
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/70 text-left dark:border-white/5 dark:bg-white/[0.02]">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Акция
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Период
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Активна
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    В попапе
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-neutral-100 last:border-b-0 dark:border-white/5"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-100 dark:bg-white/10">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageIcon className="h-4 w-4 text-neutral-300" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-brand-dark dark:text-white">
                            {item.title}
                          </p>
                          <p className="line-clamp-1 text-xs text-neutral-500">
                            {item.body}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-500">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarRange className="h-3.5 w-3.5" />
                        {formatRange(item)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        disabled={togglingActiveId === item.id}
                        className={clsx(
                          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
                          item.is_active
                            ? "bg-emerald-500"
                            : "bg-neutral-300 dark:bg-white/15",
                          togglingActiveId === item.id && "opacity-60",
                        )}
                        aria-label={item.is_active ? "Деактивировать" : "Активировать"}
                      >
                        <span
                          className={clsx(
                            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
                            item.is_active ? "translate-x-5" : "translate-x-0.5",
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleTogglePopup(item)}
                        disabled={togglingPopupId === item.id}
                        className={clsx(
                          "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                          item.show_as_popup
                            ? "bg-brand-orange/15 text-brand-orange"
                            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-400 dark:hover:bg-white/10",
                          togglingPopupId === item.id && "opacity-60",
                        )}
                      >
                        {togglingPopupId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {item.show_as_popup ? "Показывать" : "Не показывать"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/admin/content/promotions/${item.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-brand-orange dark:hover:bg-white/10"
                          aria-label="Редактировать"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteId(item.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                          aria-label="Удалить"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title="Удалить акцию?"
        description="Акция будет удалена безвозвратно. Если она была в попапе — попап перестанет показываться."
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
