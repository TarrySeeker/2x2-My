"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Save,
  Search,
  Loader2,
  RotateCcw,
  MessageSquare,
  Menu as MenuIcon,
  AlertTriangle,
  CheckCircle2,
  FormInput,
  PanelTop,
  MousePointerClick,
  FileQuestion,
  Inbox,
  Cookie,
  Type,
  ShieldCheck,
} from "lucide-react";
import clsx from "clsx";

import {
  UI_STRING_NAMESPACE_LABELS,
  UI_STRING_NAMESPACES,
  type UiStringNamespace,
} from "@/features/admin/schemas/ui-strings";
import { bulkUpdateUiStringsAction } from "@/features/admin/actions/ui-strings";
import type { UiString } from "@/lib/data/ui-strings";
import AdminPageHeader from "./AdminPageHeader";

const NS_ICONS: Record<UiStringNamespace, typeof MenuIcon> = {
  navigation:   MenuIcon,
  cookie:       Cookie,
  empty_states: Inbox,
  success:      CheckCircle2,
  errors:       AlertTriangle,
  validation:   ShieldCheck,
  placeholders: Type,
  agreements:   FileQuestion,
  buttons:      MousePointerClick,
  forms:        FormInput,
  modals:       PanelTop,
};

function isValidNs(value: string): value is UiStringNamespace {
  return (UI_STRING_NAMESPACES as readonly string[]).includes(value);
}

export default function UiStringsClient({
  initial,
}: {
  initial: UiString[];
}) {
  // Словарь оригинальных значений для отката
  const originalMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of initial) m.set(s.key, s.value);
    return m;
  }, [initial]);

  // Текущие draft-значения
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const obj: Record<string, string> = {};
    for (const s of initial) obj[s.key] = s.value;
    return obj;
  });

  const [activeNs, setActiveNs] = useState<UiStringNamespace | "all">("all");
  const [query, setQuery] = useState("");
  const [saving, startSaving] = useTransition();

  // Группировка + подсчёт строк по namespace
  const namespaces = useMemo(() => {
    const groups = new Map<UiStringNamespace, UiString[]>();
    for (const ns of UI_STRING_NAMESPACES) groups.set(ns, []);
    for (const s of initial) {
      if (isValidNs(s.namespace)) {
        groups.get(s.namespace)?.push(s);
      }
    }
    return groups;
  }, [initial]);

  // Dirty-ключи
  const dirtyKeys = useMemo(() => {
    const result: string[] = [];
    for (const [key, value] of Object.entries(drafts)) {
      if (originalMap.get(key) !== value) result.push(key);
    }
    return result;
  }, [drafts, originalMap]);

  // Warn-before-unload при несохранённых изменениях
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (dirtyKeys.length === 0) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirtyKeys.length]);

  const filteredStrings = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initial.filter((s) => {
      if (activeNs !== "all" && s.namespace !== activeNs) return false;
      if (!q) return true;
      return (
        s.key.toLowerCase().includes(q) ||
        s.value.toLowerCase().includes(q) ||
        (s.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [initial, activeNs, query]);

  function update(key: string, value: string) {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  }

  function revert(key: string) {
    const orig = originalMap.get(key);
    if (orig !== undefined) setDrafts((prev) => ({ ...prev, [key]: orig }));
  }

  function revertAll() {
    const obj: Record<string, string> = {};
    for (const [k, v] of originalMap.entries()) obj[k] = v;
    setDrafts(obj);
  }

  function save() {
    if (dirtyKeys.length === 0) return;
    const updates = dirtyKeys.map((key) => ({ key, value: drafts[key] ?? "" }));
    startSaving(async () => {
      const res = await bulkUpdateUiStringsAction(updates);
      if (!res.ok) {
        toast.error(res.error ?? "Ошибка сохранения");
        return;
      }
      toast.success(`Обновлено строк: ${res.updated ?? updates.length}`);
      // Заменяем оригиналы на новые значения (без перезагрузки)
      for (const u of updates) originalMap.set(u.key, u.value);
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Микротексты UI"
        description={`${initial.length} строк в ${UI_STRING_NAMESPACES.length} разделах. Правьте значения и сохраняйте одной кнопкой.`}
        actions={
          <div className="flex items-center gap-2">
            {dirtyKeys.length > 0 && (
              <button
                type="button"
                onClick={revertAll}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
                Отменить
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={saving || dirtyKeys.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-orange-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Сохранить {dirtyKeys.length > 0 && `(${dirtyKeys.length})`}
            </button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
        {/* Левая колонка — namespace'ы */}
        <aside className="rounded-2xl border border-neutral-200 bg-white p-2 dark:border-white/10 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => setActiveNs("all")}
            className={clsx(
              "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors",
              activeNs === "all"
                ? "bg-brand-orange/10 text-brand-orange"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5",
            )}
          >
            <span className="flex items-center gap-2.5">
              <MessageSquare className="h-4 w-4" />
              Все строки
            </span>
            <span className="rounded bg-neutral-100 px-1.5 text-xs tabular-nums dark:bg-white/10">
              {initial.length}
            </span>
          </button>
          <div className="my-2 border-t border-neutral-100 dark:border-white/5" />
          {UI_STRING_NAMESPACES.map((ns) => {
            const count = namespaces.get(ns)?.length ?? 0;
            const Icon = NS_ICONS[ns];
            const isActive = activeNs === ns;
            return (
              <button
                key={ns}
                type="button"
                onClick={() => setActiveNs(ns)}
                disabled={count === 0}
                className={clsx(
                  "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  isActive
                    ? "bg-brand-orange/10 font-medium text-brand-orange"
                    : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/5",
                )}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {UI_STRING_NAMESPACE_LABELS[ns]}
                  </span>
                </span>
                <span className="shrink-0 rounded bg-neutral-100 px-1.5 text-xs tabular-nums dark:bg-white/10">
                  {count}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Правая колонка — список */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по ключу, значению или описанию…"
              className="h-11 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-4 text-sm focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:border-white/10 dark:bg-neutral-900 dark:text-white"
            />
          </div>

          {filteredStrings.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-200 py-16 text-center dark:border-white/10">
              <Inbox className="h-10 w-10 text-neutral-300" />
              <p className="text-sm text-neutral-500">Ничего не найдено</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
              <ul className="divide-y divide-neutral-100 dark:divide-white/5">
                {filteredStrings.map((s) => {
                  const current = drafts[s.key] ?? "";
                  const dirty = originalMap.get(s.key) !== current;
                  return (
                    <li
                      key={s.key}
                      className={clsx(
                        "relative p-4 transition-colors",
                        dirty && "bg-amber-50/40 dark:bg-amber-400/5",
                      )}
                    >
                      {dirty && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                      )}
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-700 dark:bg-white/5 dark:text-neutral-300">
                              {s.key}
                            </code>
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-500 dark:bg-white/5">
                              {UI_STRING_NAMESPACE_LABELS[
                                s.namespace as UiStringNamespace
                              ] ?? s.namespace}
                            </span>
                          </div>
                          {s.description && (
                            <p className="mt-1 text-xs text-neutral-500">
                              {s.description}
                            </p>
                          )}
                        </div>
                        {dirty && (
                          <button
                            type="button"
                            onClick={() => revert(s.key)}
                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-white/5"
                            title="Отменить изменения этой строки"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Откатить
                          </button>
                        )}
                      </div>

                      <textarea
                        value={current}
                        onChange={(e) => update(s.key, e.target.value)}
                        rows={Math.max(1, Math.min(4, Math.ceil(current.length / 80)))}
                        className={clsx(
                          "mt-2.5 w-full resize-y rounded-lg border bg-transparent px-3 py-2 text-sm transition-colors focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/20 dark:text-white",
                          dirty
                            ? "border-amber-400 dark:border-amber-400/50"
                            : "border-neutral-200 dark:border-white/10",
                        )}
                        maxLength={2000}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
