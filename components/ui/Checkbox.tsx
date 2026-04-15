"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  count?: number;
};

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, count, className, id, ...rest },
  ref,
) {
  const autoId = id ?? rest.name;
  return (
    <label
      htmlFor={autoId}
      className={clsx(
        "group flex cursor-pointer select-none items-center gap-3 py-1.5 text-sm text-brand-dark",
        rest.disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          ref={ref}
          id={autoId}
          type="checkbox"
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-[5px] border border-neutral-300 bg-white transition-all hover:border-brand-orange checked:border-brand-orange checked:bg-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/50"
          {...rest}
        />
        <Check
          className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100"
          strokeWidth={3}
        />
      </span>
      {label !== undefined && (
        <span className="flex-1 font-medium">{label}</span>
      )}
      {typeof count === "number" && (
        <span className="text-xs tabular-nums text-neutral-400">({count})</span>
      )}
    </label>
  );
});

export default Checkbox;
