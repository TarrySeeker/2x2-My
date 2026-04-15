"use client";

import { type ReactNode } from "react";
import clsx from "clsx";

type RadioTileProps = {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  label: ReactNode;
  hint?: ReactNode;
  rightSlot?: ReactNode;
  disabled?: boolean;
};

/**
 * Плитка-радиокнопка. Используется в калькуляторе тиража:
 * левая часть — лейбл, правая — цена/доп-инфо.
 */
export default function RadioTile({
  name,
  value,
  checked,
  onChange,
  label,
  hint,
  rightSlot,
  disabled,
}: RadioTileProps) {
  return (
    <label
      className={clsx(
        "flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 transition-all",
        checked
          ? "border-brand-orange bg-brand-orange-soft shadow-sm"
          : "border-neutral-200 bg-white hover:border-brand-orange/60",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={clsx(
            "mt-0.5 grid h-5 w-5 place-items-center rounded-full border-2 transition-colors",
            checked
              ? "border-brand-orange bg-white"
              : "border-neutral-300 bg-white",
          )}
          aria-hidden="true"
        >
          <span
            className={clsx(
              "h-2 w-2 rounded-full bg-brand-orange transition-transform",
              checked ? "scale-100" : "scale-0",
            )}
          />
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-brand-dark">{label}</span>
          {hint && (
            <span className="text-xs text-neutral-500">{hint}</span>
          )}
        </div>
      </div>
      {rightSlot && (
        <span className="shrink-0 text-sm font-display font-bold text-brand-orange tabular-nums">
          {rightSlot}
        </span>
      )}
      <input
        type="radio"
        className="sr-only"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
    </label>
  );
}
