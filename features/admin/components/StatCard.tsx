"use client";

import { type ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import clsx from "clsx";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  today: number;
  yesterday: number;
  format?: "number" | "currency";
}

function formatValue(value: number, format: "number" | "currency"): string {
  if (format === "currency") {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat("ru-RU").format(value);
}

function getChangePercent(today: number, yesterday: number): number {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

export default function StatCard({
  title,
  value,
  icon,
  today,
  yesterday,
  format = "number",
}: StatCardProps) {
  const change = getChangePercent(today, yesterday);
  const isPositive = change >= 0;

  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border p-6 transition-colors",
        "bg-white/80 border-black/5 backdrop-blur-xl",
        "dark:bg-white/[0.04] dark:border-white/10 dark:backdrop-blur-xl",
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-brand-dark dark:text-white">
            {typeof value === "number" ? formatValue(value, format) : value}
          </p>
        </div>
        <div
          className={clsx(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            "bg-brand-orange/10 text-brand-orange",
          )}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-1.5">
        {change !== 0 ? (
          <>
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={clsx(
                "text-sm font-semibold",
                isPositive ? "text-emerald-500" : "text-red-500",
              )}
            >
              {isPositive ? "+" : ""}
              {change}%
            </span>
          </>
        ) : (
          <span className="text-sm text-neutral-400">—</span>
        )}
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          vs вчера
        </span>
      </div>

      {/* Subtle glow effect */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-orange/5 blur-2xl dark:bg-brand-orange/10" />
    </div>
  );
}
