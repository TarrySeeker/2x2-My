"use client";

import clsx from "clsx";

type PriceRangeProps = {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  className?: string;
};

const formatRub = (v: number) => new Intl.NumberFormat("ru-RU").format(v);

export default function PriceRange({
  min,
  max,
  value,
  onChange,
  step = 500,
  className,
}: PriceRangeProps) {
  const pctLow = ((value[0] - min) / (max - min)) * 100;
  const pctHigh = ((value[1] - min) / (max - min)) * 100;

  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-display font-bold text-brand-orange tabular-nums">
          {formatRub(value[0])} ₽
        </span>
        <span className="text-neutral-300">—</span>
        <span className="font-display font-bold text-brand-orange tabular-nums">
          {formatRub(value[1])} ₽
        </span>
      </div>
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-200" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-orange"
          style={{ left: `${pctLow}%`, right: `${100 - pctHigh}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[0]}
          onChange={(e) => {
            const next = Math.min(Number(e.target.value), value[1] - step);
            onChange([next, value[1]]);
          }}
          aria-label="Минимальная цена"
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent
            [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-orange [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
            [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-orange [&::-moz-range-thumb]:bg-white"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value[1]}
          onChange={(e) => {
            const next = Math.max(Number(e.target.value), value[0] + step);
            onChange([value[0], next]);
          }}
          aria-label="Максимальная цена"
          className="pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent
            [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-orange [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
            [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-orange [&::-moz-range-thumb]:bg-white"
        />
      </div>
    </div>
  );
}
