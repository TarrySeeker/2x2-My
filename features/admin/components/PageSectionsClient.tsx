"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Layers,
  Pencil,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Loader2,
  AlertCircle,
  Clock3,
  Copy,
} from "lucide-react";
import clsx from "clsx";

import type { PageSectionContentType } from "@/features/admin/schemas/page-sections";
import {
  reorderPageSectionsAction,
  togglePageSectionAction,
} from "@/features/admin/actions/page-sections";
import AdminPageHeader from "./AdminPageHeader";
import PageSectionEditor from "./PageSectionEditor";

export interface SectionRow {
  pagePath: string;
  sectionKey: string;
  contentType: PageSectionContentType;
  content: Record<string, unknown>;
  displayOrder: number;
  enabled: boolean;
  updatedAt: string | null;
  exists: boolean;
}

export interface PagePayload {
  path: string;
  label: string;
  sections: SectionRow[];
}

const CONTENT_TYPE_LABELS: Record<PageSectionContentType, string> = {
  hero:         "Hero",
  text_block:   "Текстовый блок",
  values:       "Ценности",
  cards_grid:   "Сетка карточек",
  faq:          "FAQ",
  cta:          "CTA",
  contact_info: "Контактная информация",
  stats_grid:   "Статистика",
};

const CONTENT_TYPE_COLORS: Record<PageSectionContentType, string> = {
  hero:         "bg-brand-orange/10 text-brand-orange",
  text_block:   "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  values:       "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  cards_grid:   "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  faq:          "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  cta:          "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  contact_info: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  stats_grid:   "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function PageSectionsClient({
  pages: initialPages,
}: {
  pages: PagePayload[];
}) {
  const [pages, setPages] = useState(initialPages);
  const [activePath, setActivePath] = useState<string>(
    initialPages[0]?.path ?? "/about",
  );
  const [editor, setEditor] = useState<SectionRow | null>(null);

  const active = useMemo(
    () => pages.find((p) => p.path === activePath) ?? pages[0],
    [pages, activePath],
  );

  function updateSection(path: string, next: SectionRow) {
    setPages((prev) =>
      prev.map((p) =>
        p.path !== path
          ? p
          : {
              ...p,
              sections: p.sections.map((s) =>
                s.sectionKey === next.sectionKey ? next : s,
              ),
            },
      ),
    );
  }

  function replaceSections(path: string, next: SectionRow[]) {
    setPages((prev) =>
      prev.map((p) => (p.path !== path ? p : { ...p, sections: next })),
    );
  }

  if (!active) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="Секции страниц"
          description="Не определено ни одной страницы в whitelist PAGE_SECTIONS_ALLOWED"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Секции страниц"
        description="Универсальные блоки для внутренних страниц: hero, текст, FAQ, CTA и другие"
      />

      <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
        <aside className="space-y-1">
          {pages.map((p) => {
            const isActive = p.path === activePath;
            const enabledCount = p.sections.filter((s) => s.enabled).length;
            return (
              <button
                key={p.path}
                type="button"
                onClick={() => setActivePath(p.path)}
                className={clsx(
                  "flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left transition-all",
                  isActive
                    ? "border-brand-orange bg-brand-orange/5 shadow-sm"
                    : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-brand-dark dark:text-white">
                    {p.label}
                  </p>
                  <p className="font-mono text-xs text-neutral-500">{p.path}</p>
                </div>
                <span
                  className={clsx(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                    enabledCount > 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                      : "bg-neutral-100 text-neutral-500 dark:bg-white/10",
                  )}
                >
                  {enabledCount} / {p.sections.length}
                </span>
              </button>
            );
          })}
        </aside>

        <section className="space-y-3">
          <PageHeader page={active} />
          {active.sections.length === 0 ? (
            <EmptyState />
          ) : (
            <SectionList
              page={active}
              onEdit={setEditor}
              onUpdateSection={(next) => updateSection(active.path, next)}
              onReorder={(next) => replaceSections(active.path, next)}
            />
          )}
        </section>
      </div>

      <AnimatePresence>
        {editor && (
          <PageSectionEditor
            section={editor}
            onClose={() => setEditor(null)}
            onSaved={(saved) => {
              updateSection(saved.pagePath, saved);
              setEditor(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PageHeader({ page }: { page: PagePayload }) {
  const enabledCount = page.sections.filter((s) => s.enabled).length;
  const existingCount = page.sections.filter((s) => s.exists).length;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-brand-orange" />
            <h2 className="font-semibold text-brand-dark dark:text-white">
              {page.label}
            </h2>
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-600 dark:bg-white/5 dark:text-neutral-300">
              {page.path}
            </code>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {existingCount} из {page.sections.length} секций настроено,{" "}
            {enabledCount} видно на сайте
          </p>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-16 text-center dark:border-white/10">
      <AlertCircle className="h-10 w-10 text-neutral-300" />
      <p className="text-sm text-neutral-500">
        На этой странице нет доступных секций
      </p>
    </div>
  );
}

// ============================================================
// Section list with up/down reorder
// ============================================================

function SectionList({
  page,
  onEdit,
  onUpdateSection,
  onReorder,
}: {
  page: PagePayload;
  onEdit: (s: SectionRow) => void;
  onUpdateSection: (next: SectionRow) => void;
  onReorder: (next: SectionRow[]) => void;
}) {
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [reordering, startReorder] = useTransition();

  function moveSection(idx: number, dir: -1 | 1) {
    const next = [...page.sections];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= next.length) return;
    // Меняем местами только существующие секции — для несуществующих
    // reorder в БД не делаем (их нет). Но на UI можем переставлять любые.
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    // Перезаписываем displayOrder по индексу
    const updated = next.map((s, i) => ({ ...s, displayOrder: i * 10 }));
    onReorder(updated);

    // Сохраняем порядок на сервере для существующих секций
    const existingOrders = updated
      .filter((s) => s.exists)
      .map((s) => ({ key: s.sectionKey, order: s.displayOrder }));
    if (existingOrders.length > 0) {
      startReorder(async () => {
        const res = await reorderPageSectionsAction(page.path, existingOrders);
        if (!res.ok) {
          toast.error(res.error ?? "Ошибка сохранения порядка");
          onReorder(page.sections);
        }
      });
    }
  }

  async function handleToggle(section: SectionRow, next: boolean) {
    // Если секции нет в БД — включение бесполезно, сначала нужно заполнить
    if (!section.exists) {
      toast.info("Сначала заполните контент секции");
      onEdit(section);
      return;
    }
    setTogglingKey(section.sectionKey);
    const res = await togglePageSectionAction(
      page.path,
      section.sectionKey,
      next,
    );
    setTogglingKey(null);
    if (!res.ok) {
      toast.error(res.error ?? "Ошибка");
      return;
    }
    toast.success(next ? "Секция включена" : "Секция выключена");
    onUpdateSection({
      ...section,
      enabled: next,
      updatedAt: new Date().toISOString(),
    });
  }

  async function handleDuplicate(section: SectionRow) {
    if (!section.exists) {
      toast.info("Нечего дублировать — секция ещё не заполнена");
      return;
    }
    // «Дублирование» в контексте page_sections = копируем content в буфер
    // как JSON (нет способа создать вторую секцию с тем же ключом).
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(section.content, null, 2),
      );
      toast.success("JSON-контент секции скопирован в буфер");
    } catch {
      toast.error("Не удалось скопировать");
    }
  }

  return (
    <div className="space-y-2">
      {reordering && (
        <p className="text-xs text-neutral-500">Сохраняем порядок…</p>
      )}
      <ul className="space-y-2">
        {page.sections.map((s, idx) => (
          <SectionCard
            key={`${s.pagePath}:${s.sectionKey}`}
            section={s}
            isFirst={idx === 0}
            isLast={idx === page.sections.length - 1}
            toggling={togglingKey === s.sectionKey}
            onMoveUp={() => moveSection(idx, -1)}
            onMoveDown={() => moveSection(idx, 1)}
            onToggle={(next) => handleToggle(s, next)}
            onEdit={() => onEdit(s)}
            onDuplicate={() => handleDuplicate(s)}
          />
        ))}
      </ul>
    </div>
  );
}

function SectionCard({
  section,
  isFirst,
  isLast,
  toggling,
  onMoveUp,
  onMoveDown,
  onToggle,
  onEdit,
  onDuplicate,
}: {
  section: SectionRow;
  isFirst: boolean;
  isLast: boolean;
  toggling: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: (next: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        "group relative overflow-hidden rounded-2xl border bg-white transition-all dark:bg-neutral-900",
        section.enabled
          ? "border-neutral-200 dark:border-white/10"
          : "border-neutral-200/70 bg-neutral-50/50 dark:border-white/5 dark:bg-neutral-900/50",
        !section.exists &&
          "border-dashed border-amber-300 bg-amber-50/40 dark:border-amber-400/40 dark:bg-amber-400/5",
      )}
    >
      <div className="flex items-center gap-3 p-4">
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/5"
            aria-label="Вверх"
            title="Переместить вверх"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="flex h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-white/5"
            aria-label="Вниз"
            title="Переместить вниз"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div
          className={clsx(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            CONTENT_TYPE_COLORS[section.contentType],
          )}
        >
          <Layers className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold text-brand-dark dark:text-white">
              {section.sectionKey}
            </p>
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                CONTENT_TYPE_COLORS[section.contentType],
              )}
            >
              {CONTENT_TYPE_LABELS[section.contentType]}
            </span>
            {!section.exists && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                <AlertCircle className="h-3 w-3" />
                Не заполнена
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {section.exists ? (
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {fmtDate(section.updatedAt)}
              </span>
            ) : (
              <span className="italic">Дефолтные значения, пока не заполнена</span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onToggle(!section.enabled)}
            disabled={toggling}
            title={section.enabled ? "Выключить (скрыть)" : "Включить"}
            className={clsx(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              section.enabled
                ? "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/5",
            )}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : section.enabled ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onDuplicate}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/5 md:inline-flex"
            title="Скопировать JSON секции"
          >
            <Copy className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-white/10 dark:hover:bg-white/20"
          >
            <Pencil className="h-3.5 w-3.5" />
            {section.exists ? "Редактировать" : "Заполнить"}
          </button>
        </div>
      </div>

      {section.enabled && section.exists && (
        <div className="absolute right-0 top-0 h-full w-1 bg-emerald-400/60" />
      )}
    </motion.li>
  );
}
