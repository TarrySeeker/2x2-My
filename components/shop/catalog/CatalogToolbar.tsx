"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { ArrowDownUp, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import Select from "@/components/ui/Select";

type SortValue = "popular" | "price_asc" | "price_desc" | "newest";

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: "popular", label: "По популярности" },
  { value: "price_asc", label: "Цена: по возрастанию" },
  { value: "price_desc", label: "Цена: по убыванию" },
  { value: "newest", label: "Сначала новые" },
];

type CatalogToolbarProps = {
  total: number;
  currentSort: string;
  onOpenFilters?: () => void;
  className?: string;
};

export default function CatalogToolbar({
  total,
  currentSort,
  onOpenFilters,
  className,
}: CatalogToolbarProps) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const handleSortChange = (next: string) => {
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (next === "popular") sp.delete("sort");
    else sp.set("sort", next);
    sp.delete("page");
    const query = sp.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return (
    <div
      className={clsx(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white/60 p-4 backdrop-blur",
        pending && "opacity-70",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-brand-dark shadow-sm transition-colors hover:border-brand-orange hover:text-brand-orange lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Фильтры
        </button>
        <span className="text-sm text-neutral-500">
          Найдено: <span className="font-semibold text-brand-dark">{total}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ArrowDownUp className="h-4 w-4 text-neutral-400" />
        <Select
          aria-label="Сортировка"
          value={currentSort}
          onChange={(e) => handleSortChange(e.target.value)}
          className="h-10 min-w-[220px]"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
