"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";
import clsx from "clsx";

import type { LeadType } from "@/features/admin/api/leads";

/**
 * Клиентский список заявок. Принимает уже готовый набор записей
 * (server-component тащит UNION ALL из 3-х таблиц), а здесь работаем
 * только с фильтром по типу и форматированием.
 *
 * Каждая строка кликабельна — ведёт на детальную страницу
 * `/admin/leads/<type>/<id|ref>`.
 *
 * Тип строки специально не строит сам URL — это делает родитель
 * через помощник `buildLeadHref`, чтобы /quote/CR-000001 предпочтительно
 * использовало request_number, а не числовой id (короче и опознаваемее).
 */

export interface LeadsListItem {
  type: LeadType;
  id: number;
  /** request_number / lead_number — human-readable. См. примечание про React-зарезервированное имя `ref` в LeadDetail. */
  refNumber: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  service: string | null;
  message: string | null;
  promo_code: string | null;
  source: string | null;
  status: string;
  created_at: string;
}

interface Props {
  items: LeadsListItem[];
}

const TYPE_LABEL: Record<LeadType, string> = {
  quote: "Расчёт",
  "one-click": "В 1 клик",
  contact: "Контакты",
};

const TYPE_BADGE: Record<LeadType, string> = {
  quote:
    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 ring-blue-200/60 dark:ring-blue-500/30",
  "one-click":
    "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 ring-purple-200/60 dark:ring-purple-500/30",
  contact:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-200/60 dark:ring-emerald-500/30",
};

const FILTERS: { key: LeadType | "all"; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "quote", label: "Расчёты" },
  { key: "one-click", label: "В 1 клик" },
  { key: "contact", label: "Контакты" },
];

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function truncate(value: string | null, n = 60): string | null {
  if (!value) return null;
  if (value.length <= n) return value;
  return value.slice(0, n - 1).trimEnd() + "…";
}

/**
 * Для quote предпочитаем request_number в URL (короче, узнаваемее в логах).
 * Если по какой-то причине его нет (старые записи) — fallback на id.
 */
export function buildLeadHref(item: {
  type: LeadType;
  id: number;
  /** request_number / lead_number — human-readable. См. примечание про React-зарезервированное имя `ref` в LeadDetail. */
  refNumber: string | null;
}): string {
  const segment =
    item.type === "quote" && item.refNumber
      ? item.refNumber
      : String(item.id);
  return `/admin/leads/${item.type}/${segment}`;
}

export default function LeadsListClient({ items }: Props) {
  const [filter, setFilter] = useState<LeadType | "all">("all");

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((it) => it.type === filter);
  }, [items, filter]);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-3 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-semibold text-brand-dark dark:text-white">
            Последние заявки
          </h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            ({visible.length})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-brand-orange text-white"
                  : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {visible.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-neutral-500">
          Заявок этого типа пока нет.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/50">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Тип</th>
                <th className="px-4 py-2 text-left font-medium">Имя</th>
                <th className="px-4 py-2 text-left font-medium">Телефон</th>
                <th className="px-4 py-2 text-left font-medium">Email</th>
                <th className="px-4 py-2 text-left font-medium">Услуга</th>
                <th className="px-4 py-2 text-left font-medium">Комментарий</th>
                <th className="px-4 py-2 text-left font-medium">Промокод</th>
                <th className="px-4 py-2 text-left font-medium">Источник</th>
                <th className="px-4 py-2 text-left font-medium">Статус</th>
                <th className="px-4 py-2 text-left font-medium">Когда</th>
                <th className="px-4 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
              {visible.map((row) => {
                const href = buildLeadHref(row);
                return (
                  <tr
                    key={`${row.type}-${row.id}`}
                    className="text-brand-dark transition-colors hover:bg-neutral-50 dark:text-white dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-2 align-top">
                      <span
                        className={clsx(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
                          TYPE_BADGE[row.type],
                        )}
                      >
                        {TYPE_LABEL[row.type]}
                      </span>
                      {row.refNumber && (
                        <div className="mt-1 font-mono text-[11px] text-neutral-500">
                          {row.refNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <Link
                        href={href}
                        className="hover:text-brand-orange hover:underline underline-offset-2"
                      >
                        {row.name ?? "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2 align-top font-mono text-xs">
                      {row.phone ? (
                        <a
                          href={`tel:${row.phone.replace(/[^+\d]/g, "")}`}
                          className="hover:text-brand-orange"
                        >
                          {row.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-2 align-top text-xs">
                      {row.email ? (
                        <a
                          href={`mailto:${row.email}`}
                          className="hover:text-brand-orange"
                        >
                          {row.email}
                        </a>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top text-xs">
                      {row.service ?? <span className="text-neutral-400">—</span>}
                    </td>
                    <td
                      className="max-w-[260px] px-4 py-2 align-top text-xs text-neutral-600 dark:text-neutral-400"
                      title={row.message ?? undefined}
                    >
                      {truncate(row.message) ?? (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top">
                      {row.promo_code ? (
                        <span className="inline-flex items-center rounded-md bg-brand-orange/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-brand-orange ring-1 ring-inset ring-brand-orange/30">
                          {row.promo_code}
                        </span>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 align-top text-xs text-neutral-500">
                      {row.source ?? "—"}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {row.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 align-top text-xs text-neutral-500">
                      {formatDate(row.created_at)}
                    </td>
                    <td className="px-4 py-2 align-top text-right">
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Открыть
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
