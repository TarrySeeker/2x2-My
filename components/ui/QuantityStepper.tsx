"use client";

import { Minus, Plus } from "lucide-react";
import clsx from "clsx";

type QuantityStepperProps = {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  label?: string;
};

export default function QuantityStepper({
  value,
  min = 1,
  max = 9999,
  step = 1,
  onChange,
  className,
  label,
}: QuantityStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          {label}
        </span>
      )}
      <div className="inline-flex h-11 w-fit items-center rounded-lg border border-neutral-200 bg-white">
        <button
          type="button"
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          aria-label="Уменьшить"
          className="flex h-full w-11 items-center justify-center rounded-l-lg text-neutral-500 transition-colors hover:bg-brand-orange-soft hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Minus className="h-4 w-4" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isFinite(next)) onChange(clamp(next));
          }}
          className="h-full w-16 appearance-none bg-transparent text-center font-display text-base font-bold text-brand-dark outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          aria-label="Увеличить"
          className="flex h-full w-11 items-center justify-center rounded-r-lg text-neutral-500 transition-colors hover:bg-brand-orange-soft hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
