"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  FileText,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Hash,
  Clock3,
  CheckCircle2,
  Copy,
  Info,
} from "lucide-react";
import clsx from "clsx";

import {
  PAGE_CONTENT_PLACEHOLDERS,
  pageContentSchema,
} from "@/features/admin/schemas/page-content";
import { updatePageContentAction } from "@/features/admin/actions/page-content";
import AdminPageHeader from "./AdminPageHeader";

export interface LegalPageRow {
  path: string;
  label: string;
  description: string;
  title: string;
  contentMarkdown: string;
  version: number;
  published: boolean;
  updatedAt: string | null;
  exists: boolean;
}

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

export default function LegalPagesClient({
  rows: initialRows,
}: {
  rows: LegalPageRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [activePath, setActivePath] = useState(initialRows[0]?.path ?? "/privacy");

  const active = rows.find((r) => r.path === activePath) ?? rows[0];

  function handleSaved(saved: LegalPageRow) {
    setRows((prev) => prev.map((r) => (r.path === saved.path ? saved : r)));
  }

  if (!active) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Правовые страницы"
          description="Ни одной правовой страницы не настроено"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Правовые страницы"
        description="Политика конфиденциальности, условия использования и публичная оферта"
      />

      <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
        <aside className="space-y-2">
          {rows.map((r) => {
            const isActive = r.path === activePath;
            return (
              <button
                key={r.path}
                type="button"
                onClick={() => setActivePath(r.path)}
                className={clsx(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all",
                  isActive
                    ? "border-brand-orange bg-brand-orange/5 shadow-sm"
                    : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20",
                )}
              >
                <div
                  className={clsx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isActive
                      ? "bg-brand-orange/15 text-brand-orange"
                      : "bg-neutral-100 text-neutral-500 dark:bg-white/5",
                  )}
                >
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-brand-dark dark:text-white">
                    {r.label}
                  </p>
                  <p className="font-mono text-xs text-neutral-500">{r.path}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs">
                    {r.exists ? (
                      <>
                        <span className="inline-flex items-center gap-1 text-neutral-500">
                          <Hash className="h-3 w-3" />v{r.version}
                        </span>
                        {r.published ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Eye className="h-3 w-3" />
                            Опубликовано
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-neutral-400">
                            <EyeOff className="h-3 w-3" />
                            Черновик
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="italic text-amber-600">Не настроено</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </aside>

        <div>
          <LegalPageEditor
            key={active.path}
            row={active}
            onSaved={handleSaved}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Editor
// ============================================================

function LegalPageEditor({
  row,
  onSaved,
}: {
  row: LegalPageRow;
  onSaved: (row: LegalPageRow) => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [content, setContent] = useState(row.contentMarkdown);
  const [published, setPublished] = useState(row.published);
  const [error, setError] = useState<string | null>(null);
  const [submitting, startTransition] = useTransition();

  const dirty =
    title !== row.title ||
    content !== row.contentMarkdown ||
    published !== row.published;

  function handleSubmit() {
    setError(null);
    const parsed = pageContentSchema.safeParse({
      path: row.path,
      title,
      content_markdown: content,
      published,
    });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Невалидные данные";
      setError(msg);
      toast.error(msg);
      return;
    }

    startTransition(async () => {
      const res = await updatePageContentAction(row.path, {
        title: parsed.data.title,
        content_markdown: parsed.data.content_markdown,
        published: parsed.data.published,
      });
      if (!res.ok) {
        setError(res.error ?? "Ошибка сохранения");
        toast.error(res.error ?? "Ошибка сохранения");
        return;
      }
      toast.success("Страница сохранена");
      onSaved({
        ...row,
        title: parsed.data.title,
        contentMarkdown: parsed.data.content_markdown,
        published: parsed.data.published,
        version: row.exists ? row.version + 1 : 1,
        updatedAt: new Date().toISOString(),
        exists: true,
      });
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
      <header className="border-b border-neutral-200 p-5 dark:border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-brand-dark dark:text-white">
              {row.label}
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">{row.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-xs text-neutral-500">
            {row.exists && (
              <>
                <span className="inline-flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  v{row.version}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {fmtDate(row.updatedAt)}
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-5 p-5">
        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-brand-dark dark:text-neutral-200">
            Заголовок страницы
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-transparent px-3 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white"
            placeholder="Политика конфиденциальности"
          />
        </div>

        {/* Published toggle */}
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3.5 dark:border-white/10">
          <input
            type="checkbox"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-brand-orange focus:ring-brand-orange"
          />
          <div>
            <div className="flex items-center gap-2">
              {published ? (
                <Eye className="h-4 w-4 text-emerald-500" />
              ) : (
                <EyeOff className="h-4 w-4 text-neutral-400" />
              )}
              <span className="text-sm font-medium text-brand-dark dark:text-white">
                Публиковать на сайте
              </span>
            </div>
            <p className="mt-0.5 text-xs text-neutral-500">
              Если выключено — страница недоступна посетителям (404)
            </p>
          </div>
        </label>

        {/* Placeholders hint */}
        <PlaceholdersHint onInsert={(p) => setContent((prev) => prev + `{${p}}`)} />

        {/* Markdown editor */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label className="block text-sm font-medium text-brand-dark dark:text-neutral-200">
              Текст страницы (Markdown)
            </label>
            <span className="text-xs text-neutral-400 tabular-nums">
              {content.length.toLocaleString("ru-RU")} / 200 000
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={24}
            maxLength={200000}
            className="w-full resize-y rounded-lg border border-neutral-200 bg-transparent px-3 py-2.5 font-mono text-[13px] leading-relaxed focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:text-white"
            placeholder={`## 1. Общие положения\n\nООО {legal_name}, ИНН {inn}, далее...`}
          />
          <p className="mt-1.5 text-xs text-neutral-500">
            Поддерживается Markdown. Плейсхолдеры вида <code>{"{legal_name}"}</code>{" "}
            подставляются автоматически при рендере страницы.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-neutral-200 bg-neutral-50 px-5 py-3.5 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="flex items-center gap-2 text-xs">
          {dirty ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Несохранённые изменения
            </span>
          ) : row.exists ? (
            <span className="inline-flex items-center gap-1.5 text-neutral-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Всё сохранено
            </span>
          ) : (
            <span className="text-neutral-500">Новая запись</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !dirty}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Сохранить
        </button>
      </footer>
    </div>
  );
}

function PlaceholdersHint({ onInsert }: { onInsert: (key: string) => void }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:border-blue-400/30 dark:bg-blue-400/5">
      <div className="flex items-start gap-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="flex-1">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
            Подстановка данных из настроек
          </p>
          <p className="mt-0.5 text-xs text-blue-800/80 dark:text-blue-200/80">
            Кликните на плейсхолдер, чтобы вставить в текст. Значения берутся
            из раздела «Настройки сайта» — Реквизиты, Контакты.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PAGE_CONTENT_PLACEHOLDERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onInsert(p)}
                className="group inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-2 py-0.5 font-mono text-xs text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-400/40 dark:bg-blue-500/10 dark:text-blue-200"
              >
                {"{" + p + "}"}
                <Copy className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
