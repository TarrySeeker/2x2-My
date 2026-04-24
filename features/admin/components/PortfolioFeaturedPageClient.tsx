"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Star,
  Save,
  Loader2,
  ImageIcon,
  Search,
  EyeOff,
  Info,
} from "lucide-react";
import clsx from "clsx";

import type { PortfolioItem } from "@/types";
import { setFeaturedPortfolioAction } from "@/features/admin/actions/portfolio";
import AdminPageHeader from "./AdminPageHeader";

interface Props {
  items: PortfolioItem[];
}

const MAX_FEATURED = 3;

export default function PortfolioFeaturedPageClient({ items }: Props) {
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

  function clearAll() {
    setSelected([]);
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
    // Перерисуем initial → текущим, чтобы dirty=false (в рамках сессии)
    // Будет полностью корректно после router.refresh, но мы и так держим
    // selected как source of truth.
  }

  const selectedItems = useMemo(() => {
    const map = new Map(items.map((i) => [i.id, i]));
    return selected
      .map((id) => map.get(id))
      .filter((x): x is PortfolioItem => Boolean(x));
  }, [items, selected]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Главные работы (на главной странице)"
        description={`Выбрано: ${selected.length} из ${MAX_FEATURED}`}
        actions={
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-600 hover:border-neutral-300 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300"
              >
                Очистить
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Сохранить порядок
            </button>
          </div>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
        <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-900 dark:text-blue-200">
          <p className="font-medium">Это раздел только для выбора главных работ.</p>
          <p className="mt-0.5 text-blue-800/80 dark:text-blue-200/70">
            Полный список работ портфолио (создание, редактирование, фотографии)
            находится в общем разделе портфолио — будет добавлен отдельно. Здесь
            помечайте работы, которые покажем сразу после Hero на главной.
          </p>
        </div>
      </div>

      {/* Selected — порядок */}
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

      {/* Search */}
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

      {/* Grid */}
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
