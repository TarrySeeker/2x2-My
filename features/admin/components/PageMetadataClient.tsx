"use client";

import { useMemo, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Plus,
  Save,
  Loader2,
  X,
  ShieldAlert,
  CheckCircle2,
  Pencil,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";
import clsx from "clsx";

import {
  pageMetadataSchema,
  type PageMetadataInput,
} from "@/features/admin/schemas/page-metadata";
import { updatePageMetadataAction } from "@/features/admin/actions/page-metadata";
import AdminPageHeader from "./AdminPageHeader";
import TagsInput from "./TagsInput";
import SerpPreview from "./SerpPreview";
import SeoHelpBanner from "./SeoHelpBanner";

export interface PageMetadataRow {
  path: string;
  title: string | null;
  description: string | null;
  keywords: string[];
  ogImage: string | null;
  canonical: string | null;
  noindex: boolean;
  updatedAt: string | null;
  exists: boolean;
}

const PATH_LABELS: Record<string, string> = {
  "/":            "Главная",
  "/about":       "О компании",
  "/services":    "Услуги",
  "/portfolio":   "Портфолио",
  "/contacts":    "Контакты",
  "/faq":         "FAQ",
  "/blog":        "Блог",
  "/privacy":     "Политика конфиденциальности",
  "/terms":       "Условия использования",
  "/offer":       "Оферта",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function PageMetadataClient({
  rows: initialRows,
}: {
  rows: PageMetadataRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState<PageMetadataRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const missingPaths = useMemo(
    () => rows.filter((r) => !r.exists).map((r) => r.path),
    [rows],
  );

  function handleSaved(saved: PageMetadataRow) {
    setRows((prev) =>
      prev.some((r) => r.path === saved.path)
        ? prev.map((r) => (r.path === saved.path ? saved : r))
        : [...prev, saved],
    );
    setEditing(null);
    setAddOpen(false);
  }

  return (
    <div className="space-y-6">
      <SeoHelpBanner />

      <AdminPageHeader
        title="SEO: мета-теги страниц"
        description="Заголовки, описания и robots для публичных страниц сайта"
        actions={
          missingPaths.length > 0 ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover"
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          ) : null
        }
      />

      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-white/10 dark:bg-white/[0.02]">
            <tr>
              <th className="px-4 py-3 font-medium">Путь</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Description</th>
              <th className="px-4 py-3 font-medium text-center">Robots</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Обновлено</th>
              <th className="px-4 py-3 w-12" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const label = PATH_LABELS[row.path] ?? row.path;
              return (
                <tr
                  key={row.path}
                  onClick={() => setEditing(row)}
                  className="group cursor-pointer border-b border-neutral-100 transition-colors last:border-0 hover:bg-neutral-50 dark:border-white/5 dark:hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                        <Globe className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-brand-dark dark:text-white">
                          {label}
                        </p>
                        <p className="font-mono text-xs text-neutral-500">{row.path}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {row.title ? (
                      <div className="max-w-xs">
                        <p className="truncate text-neutral-800 dark:text-neutral-200">
                          {row.title}
                        </p>
                        <p className={clsx(
                          "mt-0.5 text-xs",
                          row.title.length > 60 ? "text-amber-600" : "text-neutral-400",
                        )}>
                          {row.title.length} символов
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs italic text-neutral-400">
                        Используется дефолт
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top hidden md:table-cell">
                    {row.description ? (
                      <p className="line-clamp-2 max-w-sm text-neutral-600 dark:text-neutral-400">
                        {row.description}
                      </p>
                    ) : (
                      <span className="text-xs italic text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center align-top">
                    {row.noindex ? (
                      <span
                        title="Страница скрыта от поисковиков"
                        className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/10 dark:text-red-400"
                      >
                        <EyeOff className="h-3 w-3" />
                        noindex
                      </span>
                    ) : (
                      <span
                        title="Страница индексируется"
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      >
                        <Eye className="h-3 w-3" />
                        index
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top hidden lg:table-cell text-xs text-neutral-500">
                    {fmtDate(row.updatedAt)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Pencil className="h-4 w-4 text-neutral-300 transition-colors group-hover:text-brand-orange" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {editing && (
          <MetadataEditor
            initial={editing}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
          />
        )}
        {addOpen && (
          <AddPathDialog
            availablePaths={missingPaths}
            onClose={() => setAddOpen(false)}
            onPick={(path) => {
              const blank = rows.find((r) => r.path === path);
              if (blank) {
                setAddOpen(false);
                setEditing(blank);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
// Добавление пути — модалка выбора из whitelist
// ============================================================

function AddPathDialog({
  availablePaths,
  onClose,
  onPick,
}: {
  availablePaths: string[];
  onClose: () => void;
  onPick: (path: string) => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-xl dark:border dark:border-white/10 dark:bg-neutral-900"
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 rounded-full p-1 text-neutral-400 hover:text-neutral-600"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="text-lg font-semibold text-brand-dark dark:text-white">
          Добавить SEO-мету
        </h3>
        <p className="mt-1 text-sm text-neutral-500">
          Выберите страницу из списка
        </p>

        <div className="mt-4 max-h-80 space-y-1 overflow-y-auto">
          {availablePaths.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">
              Все страницы уже настроены
            </p>
          ) : (
            availablePaths.map((path) => (
              <button
                key={path}
                type="button"
                onClick={() => onPick(path)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-white/5"
              >
                <span className="font-medium text-brand-dark dark:text-white">
                  {PATH_LABELS[path] ?? path}
                </span>
                <span className="font-mono text-xs text-neutral-500">{path}</span>
              </button>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Редактор SEO-меты — drawer-style модалка справа
// ============================================================

const inputCn =
  "h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm transition-colors focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white";

function MetadataEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: PageMetadataRow;
  onClose: () => void;
  onSaved: (row: PageMetadataRow) => void;
}) {
  const [submitting, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<PageMetadataInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pageMetadataSchema) as any,
    defaultValues: {
      path: initial.path,
      title: initial.title ?? "",
      description: initial.description ?? "",
      keywords: initial.keywords,
      og_image: initial.ogImage ?? "",
      canonical: initial.canonical ?? "",
      noindex: initial.noindex,
    },
  });

  const titleWatch = watch("title") ?? "";
  const descWatch = watch("description") ?? "";

  function onSubmit(data: PageMetadataInput) {
    startTransition(async () => {
      const res = await updatePageMetadataAction(initial.path, {
        title: data.title || null,
        description: data.description || null,
        keywords: data.keywords ?? [],
        og_image: data.og_image || null,
        canonical: data.canonical || null,
        noindex: data.noindex,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Ошибка сохранения");
        return;
      }
      toast.success("Мета-теги сохранены");
      onSaved({
        path: initial.path,
        title: data.title ?? null,
        description: data.description ?? null,
        keywords: data.keywords ?? [],
        ogImage: data.og_image ?? null,
        canonical: data.canonical ?? null,
        noindex: Boolean(data.noindex),
        updatedAt: new Date().toISOString(),
        exists: true,
      });
    });
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 36 }}
        className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-neutral-900"
      >
        <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-white/10">
          <div>
            <p className="text-xs font-medium text-neutral-500">
              SEO-мета страницы
            </p>
            <h3 className="mt-0.5 text-lg font-semibold text-brand-dark dark:text-white">
              {PATH_LABELS[initial.path] ?? initial.path}
              <span className="ml-2 font-mono text-sm font-normal text-neutral-400">
                {initial.path}
              </span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 space-y-5 overflow-y-auto p-6"
        >
          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label className="text-sm font-medium text-brand-dark dark:text-neutral-200">
                Title
              </label>
              <span
                className={clsx(
                  "text-xs tabular-nums",
                  titleWatch.length > 60
                    ? "font-semibold text-amber-600"
                    : titleWatch.length > 50
                      ? "text-neutral-600"
                      : "text-neutral-400",
                )}
              >
                {titleWatch.length} / 60
              </span>
            </div>
            <input
              {...register("title")}
              className={inputCn}
              placeholder="Например: Световые буквы в Ханты-Мансийске — 2×2"
            />
            {titleWatch.length > 60 && (
              <p className="mt-1 text-xs text-amber-600">
                Google обрезает title на ~60 символов
              </p>
            )}
            {errors.title?.message && (
              <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <label className="text-sm font-medium text-brand-dark dark:text-neutral-200">
                Description
              </label>
              <span
                className={clsx(
                  "text-xs tabular-nums",
                  descWatch.length > 160
                    ? "font-semibold text-amber-600"
                    : descWatch.length > 140
                      ? "text-neutral-600"
                      : "text-neutral-400",
                )}
              >
                {descWatch.length} / 160
              </span>
            </div>
            <textarea
              {...register("description")}
              rows={3}
              className={clsx(inputCn, "h-auto py-2 leading-relaxed")}
              placeholder="Короткое описание страницы для поисковой выдачи"
            />
            {descWatch.length > 160 && (
              <p className="mt-1 text-xs text-amber-600">
                Description обычно обрезается на ~160 символов
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
              Ключевые слова
            </label>
            <Controller
              control={control}
              name="keywords"
              render={({ field }) => (
                <TagsInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Введите тег и нажмите Enter"
                  max={40}
                />
              )}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Не влияет на Google напрямую, но используется в OpenGraph и Яндекс-поиске
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                OG-изображение
              </label>
              <input
                {...register("og_image")}
                className={inputCn}
                placeholder="/og-about.jpg или https://..."
              />
              {errors.og_image?.message && (
                <p className="mt-1 text-xs text-red-500">{errors.og_image.message}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
                Canonical URL
              </label>
              <input
                {...register("canonical")}
                className={inputCn}
                placeholder="https://2x2hm.ru/about"
              />
              {errors.canonical?.message && (
                <p className="mt-1 text-xs text-red-500">{errors.canonical.message}</p>
              )}
              <p className="mt-1 text-xs text-neutral-500">
                Оставьте пустым для автоматического значения
              </p>
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3.5 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:hover:bg-white/[0.02]">
            <input
              type="checkbox"
              {...register("noindex")}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-orange focus:ring-brand-orange"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-brand-dark dark:text-white">
                  Скрыть от поисковиков (noindex)
                </span>
              </div>
              <p className="mt-0.5 text-xs text-neutral-500">
                Страница не будет индексироваться Google/Яндекс
              </p>
            </div>
          </label>

          <div className="rounded-xl border border-neutral-200 p-4 dark:border-white/10">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Предпросмотр в поиске
            </p>
            <SerpPreview
              title={titleWatch}
              description={descWatch}
              slug={initial.path === "/" ? "" : initial.path.replace(/^\//, "")}
            />
          </div>
        </form>

        <footer className="flex items-center justify-between border-t border-neutral-200 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {initial.exists ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Сохранено {fmtDate(initial.updatedAt)}
              </>
            ) : (
              <span>Новая запись</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Сохранить
            </button>
          </div>
        </footer>
      </motion.aside>
    </motion.div>
  );
}
