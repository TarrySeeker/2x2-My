"use client";

import { type SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, className, children, id, ...rest },
  ref,
) {
  const autoId = id ?? rest.name;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={autoId}
          className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={autoId}
          className={clsx(
            "h-11 w-full appearance-none rounded-lg border border-neutral-200 bg-white pl-4 pr-10 text-sm font-medium text-brand-dark outline-none transition-colors",
            "hover:border-neutral-300 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/25",
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      </div>
    </div>
  );
});

export default Select;
