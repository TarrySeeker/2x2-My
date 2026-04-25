import Link from "next/link";
import { type ReactNode } from "react";
import clsx from "clsx";

/**
 * StatTile — лаконичная плитка-счётчик для админ-дашборда.
 *
 * Заменяет старый StatCard (он показывал «vs вчера» дельты в %, что
 * не имеет смысла без накопленной статистики заявок). Здесь — чистая
 * подача: значение + подпись, опционально кликабельно и подсвечено,
 * если требует внимания.
 */
export interface StatTileProps {
  title: string;
  value: string | number;
  caption?: string;
  icon: ReactNode;
  href?: string;
  /**
   * Когда true — иконку и значение подкрашиваем брендовым оранжевым
   * и добавляем тонкое свечение по краю (привлекает внимание).
   */
  highlight?: boolean;
}

export default function StatTile({
  title,
  value,
  caption,
  icon,
  href,
  highlight = false,
}: StatTileProps) {
  const inner = (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-2xl border p-6 transition-colors",
        "bg-white/80 border-black/5 backdrop-blur-xl",
        "dark:bg-white/[0.04] dark:border-white/10 dark:backdrop-blur-xl",
        href && "hover:border-brand-orange/30 dark:hover:border-brand-orange/40",
        highlight && "ring-1 ring-brand-orange/30 dark:ring-brand-orange/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {title}
          </p>
          <p
            className={clsx(
              "mt-2 text-3xl font-bold tracking-tight tabular-nums",
              highlight
                ? "text-brand-orange"
                : "text-brand-dark dark:text-white",
            )}
          >
            {value}
          </p>
        </div>
        <div
          className={clsx(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            highlight
              ? "bg-brand-orange text-white"
              : "bg-brand-orange/10 text-brand-orange",
          )}
        >
          {icon}
        </div>
      </div>

      {caption && (
        <p className="mt-3 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
          {caption}
        </p>
      )}

      {/* Subtle glow */}
      <div
        aria-hidden
        className={clsx(
          "pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-opacity",
          highlight
            ? "bg-brand-orange/20 dark:bg-brand-orange/25"
            : "bg-brand-orange/5 dark:bg-brand-orange/10",
        )}
      />
    </div>
  );

  if (!href) return inner;

  return (
    <Link href={href} aria-label={title}>
      {inner}
    </Link>
  );
}
