"use client";

import {
  MessageSquare,
  Star,
  BarChart3,
  Clock,
} from "lucide-react";
import { BarChart, Bar, XAxis, Cell, ResponsiveContainer } from "recharts";
import clsx from "clsx";
import type { ReviewsStats } from "@/features/admin/api/reviews";

interface ReviewStatsCardsProps {
  stats: ReviewsStats;
}

function MiniStatCard({
  title,
  value,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border p-5 transition-colors",
        "bg-white/80 border-black/5 backdrop-blur-xl",
        "dark:bg-white/[0.04] dark:border-white/10 dark:backdrop-blur-xl",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            {title}
          </p>
          <p
            className={clsx(
              "mt-1.5 text-2xl font-bold tracking-tight",
              accent
                ? "text-brand-orange"
                : "text-brand-dark dark:text-white",
            )}
          >
            {value}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
          {icon}
        </div>
      </div>
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-orange/5 blur-2xl dark:bg-brand-orange/10" />
    </div>
  );
}

const RATING_COLORS = [
  "#ef4444", // 1 star - red
  "#f97316", // 2 stars - orange
  "#eab308", // 3 stars - yellow
  "#84cc16", // 4 stars - lime
  "#22c55e", // 5 stars - green
];

export default function ReviewStatsCards({ stats }: ReviewStatsCardsProps) {
  const chartData = [1, 2, 3, 4, 5].map((rating) => ({
    rating: `${rating}★`,
    count: stats.byRating[rating] ?? 0,
  }));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MiniStatCard
        title="Всего отзывов"
        value={stats.total}
        icon={<MessageSquare className="h-5 w-5" />}
      />
      <MiniStatCard
        title="Средний рейтинг"
        value={stats.avgRating > 0 ? `${stats.avgRating} ★` : "—"}
        icon={<Star className="h-5 w-5" />}
      />

      {/* Rating distribution mini chart */}
      <div
        className={clsx(
          "relative overflow-hidden rounded-2xl border p-5 transition-colors",
          "bg-white/80 border-black/5 backdrop-blur-xl",
          "dark:bg-white/[0.04] dark:border-white/10 dark:backdrop-blur-xl",
        )}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              По звёздам
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-orange/10 text-brand-orange">
            <BarChart3 className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-2 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={14}>
              <XAxis
                dataKey="rating"
                tick={{ fontSize: 10, fill: "#a3a3a3" }}
                axisLine={false}
                tickLine={false}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={RATING_COLORS[idx]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-brand-orange/5 blur-2xl dark:bg-brand-orange/10" />
      </div>

      <MiniStatCard
        title="На модерации"
        value={stats.pending}
        icon={<Clock className="h-5 w-5" />}
        accent={stats.pending > 0}
      />
    </div>
  );
}
