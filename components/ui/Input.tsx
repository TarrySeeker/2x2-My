"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import clsx from "clsx";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
  containerClassName?: string;
};

/**
 * Базовый input в стиле Yna.
 * rounded-lg, border-neutral-200, focus-visible:ring-brand-orange.
 */
const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    leftSlot,
    rightSlot,
    containerClassName,
    className,
    id,
    ...rest
  },
  ref,
) {
  const autoId = id ?? rest.name ?? undefined;
  return (
    <div className={clsx("flex flex-col gap-1.5", containerClassName)}>
      {label && (
        <label
          htmlFor={autoId}
          className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500"
        >
          {label}
        </label>
      )}
      <div
        className={clsx(
          "group relative flex items-center gap-2 rounded-lg border bg-white px-4 transition-colors",
          "focus-within:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/25",
          error
            ? "border-[var(--color-danger)]"
            : "border-neutral-200 hover:border-neutral-300",
        )}
      >
        {leftSlot && (
          <span className="text-neutral-400 group-focus-within:text-brand-orange">
            {leftSlot}
          </span>
        )}
        <input
          ref={ref}
          id={autoId}
          className={clsx(
            "w-full bg-transparent py-3 text-base text-brand-dark placeholder:text-neutral-400 outline-none",
            className,
          )}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${autoId}-error` : undefined}
          {...rest}
        />
        {rightSlot && <span className="text-neutral-400">{rightSlot}</span>}
      </div>
      {error ? (
        <span
          id={`${autoId}-error`}
          className="text-xs font-medium text-[var(--color-danger)]"
        >
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-neutral-500">{hint}</span>
      ) : null}
    </div>
  );
});

export default Input;
