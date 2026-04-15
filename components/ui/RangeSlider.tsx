"use client";

import { useId, type ChangeEvent } from "react";
import clsx from "clsx";

type RangeSliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  formatValue?: (v: number) => string;
  className?: string;
};

/**
 * Одиночный range-слайдер на нативном input[type="range"].
 * Стилизация через accent-brand-orange + кастомный track.
 */
export default function RangeSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  formatValue,
  className,
}: RangeSliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={clsx("flex flex-col gap-2", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500"
          >
            {label}
          </label>
          <span className="font-display text-sm font-bold text-brand-orange tabular-nums">
            {formatValue ? formatValue(value) : value}
          </span>
        </div>
      )}
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-brand-orange"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onChange(Number(e.target.value))
          }
          className="absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent accent-brand-orange
            [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent
            [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-orange [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
            [&::-moz-range-track]:h-1.5 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-transparent
            [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-orange [&::-moz-range-thumb]:bg-white"
        />
      </div>
    </div>
  );
}
