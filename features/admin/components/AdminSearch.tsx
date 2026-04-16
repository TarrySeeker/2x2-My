"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import clsx from "clsx";

interface AdminSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  debounceMs?: number;
}

export default function AdminSearch({
  value,
  onChange,
  placeholder = "Поиск...",
  className,
  debounceMs = 300,
}: AdminSearchProps) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  function handleChange(next: string) {
    setLocal(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onChange(next), debounceMs);
  }

  function handleClear() {
    setLocal("");
    onChange("");
  }

  return (
    <div className={clsx("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
      <input
        type="text"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(
          "h-10 w-full rounded-lg border bg-transparent pl-9 pr-9 text-sm outline-none transition-colors",
          "border-neutral-200 hover:border-neutral-300 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20",
          "dark:border-white/10 dark:text-white dark:placeholder:text-neutral-500 dark:hover:border-white/20 dark:focus:border-brand-orange",
        )}
      />
      {local && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
          aria-label="Очистить поиск"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
