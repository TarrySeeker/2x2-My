"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import clsx from "clsx";
import type { ChartDataPoint } from "@/features/admin/types";

interface RevenueChartProps {
  data7d: ChartDataPoint[];
  data30d: ChartDataPoint[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function RevenueChart({ data7d, data30d }: RevenueChartProps) {
  const [period, setPeriod] = useState<"7d" | "30d">("7d");
  const data = period === "7d" ? data7d : data30d;

  return (
    <div
      className={clsx(
        "rounded-2xl border p-6",
        "bg-white/80 border-black/5 backdrop-blur-xl",
        "dark:bg-white/[0.04] dark:border-white/10",
      )}
    >
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-dark dark:text-white">
          Выручка
        </h3>
        <div className="flex rounded-lg bg-neutral-100 p-0.5 dark:bg-white/10">
          {(["7d", "30d"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={clsx(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                period === p
                  ? "bg-white text-brand-dark shadow-sm dark:bg-white/15 dark:text-white"
                  : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400",
              )}
            >
              {p === "7d" ? "7 дней" : "30 дней"}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Нет данных за период
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-neutral-100 dark:text-white/10"
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-neutral-400 dark:text-neutral-500"
              />
              <YAxis
                tickFormatter={(v) => `${Math.round(v / 1000)}к`}
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-neutral-400 dark:text-neutral-500"
                width={45}
              />
              <Tooltip
                formatter={(value) => [formatRub(Number(value)), "Выручка"]}
                labelFormatter={(label) => formatDate(String(label))}
                contentStyle={{
                  borderRadius: 12,
                  border: "none",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  fontSize: 13,
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#FF6B00"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: "#FF6B00", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
