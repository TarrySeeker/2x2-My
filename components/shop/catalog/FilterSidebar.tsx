"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition, useEffect } from "react";
import clsx from "clsx";
import { RotateCcw } from "lucide-react";
import Checkbox from "@/components/ui/Checkbox";
import PriceRange from "@/components/ui/PriceRange";
import type { ProductFacets } from "@/types";

type FilterSidebarProps = {
  facets: ProductFacets;
  className?: string;
};

const PRICING_MODE_LABEL: Record<string, string> = {
  calculator: "С онлайн-расчётом",
  quote: "По запросу",
  fixed: "Фикс-цена",
};

const BOOLEAN_FLAGS = [
  { key: "has_installation", label: "С монтажом" },
  { key: "is_new", label: "Новинки" },
  { key: "is_on_sale", label: "По акции" },
];

export default function FilterSidebar({ facets, className }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [priceMin, priceMax] = [
    Math.floor(facets.price_range.min ?? 0),
    Math.ceil(facets.price_range.max ?? 0),
  ];

  const initialMin = Number(params?.get("price_min") ?? priceMin);
  const initialMax = Number(params?.get("price_max") ?? priceMax);

  const [range, setRange] = useState<[number, number]>([initialMin, initialMax]);

  useEffect(() => {
    setRange([initialMin, initialMax]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.get("price_min"), params?.get("price_max")]);

  const activePricingMode = params?.get("pricing_mode") ?? null;

  const flags = useMemo(
    () => new Set((params?.get("flags") ?? "").split(",").filter(Boolean)),
    [params],
  );

  const updateParam = (mutator: (sp: URLSearchParams) => void) => {
    const sp = new URLSearchParams(params?.toString() ?? "");
    mutator(sp);
    sp.delete("page");
    const query = sp.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const togglePricingMode = (mode: string, checked: boolean) => {
    updateParam((sp) => {
      if (checked) sp.set("pricing_mode", mode);
      else sp.delete("pricing_mode");
    });
  };

  const toggleFlag = (flag: string, checked: boolean) => {
    updateParam((sp) => {
      const current = new Set(
        (sp.get("flags") ?? "").split(",").filter(Boolean),
      );
      if (checked) current.add(flag);
      else current.delete(flag);
      if (current.size) sp.set("flags", [...current].join(","));
      else sp.delete("flags");
    });
  };

  const commitRange = (next: [number, number]) => {
    setRange(next);
    updateParam((sp) => {
      if (next[0] === priceMin) sp.delete("price_min");
      else sp.set("price_min", String(next[0]));
      if (next[1] === priceMax) sp.delete("price_max");
      else sp.set("price_max", String(next[1]));
    });
  };

  const reset = () => {
    updateParam((sp) => {
      sp.delete("price_min");
      sp.delete("price_max");
      sp.delete("pricing_mode");
      sp.delete("flags");
    });
    setRange([priceMin, priceMax]);
  };

  const hasActiveFilters =
    activePricingMode ||
    flags.size > 0 ||
    range[0] !== priceMin ||
    range[1] !== priceMax;

  return (
    <aside
      className={clsx(
        "flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm",
        pending && "opacity-70",
        className,
      )}
      aria-label="Фильтры каталога"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-brand-dark">
          Фильтры
        </h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-orange transition-colors hover:text-orange-600"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Сбросить
          </button>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Цена
        </h3>
        <PriceRange
          min={priceMin}
          max={priceMax || priceMin + 1000}
          value={range}
          onChange={commitRange}
          step={Math.max(100, Math.round((priceMax - priceMin) / 100))}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Тип расчёта
        </h3>
        {facets.pricing_modes
          .filter((m) => m.count > 0)
          .map((mode) => (
            <Checkbox
              key={mode.value}
              label={`${PRICING_MODE_LABEL[mode.value] ?? mode.value}`}
              count={mode.count}
              checked={activePricingMode === mode.value}
              onChange={(e) => togglePricingMode(mode.value, e.target.checked)}
            />
          ))}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
          Особенности
        </h3>
        {BOOLEAN_FLAGS.map((flag) => {
          const count =
            flag.key === "has_installation"
              ? facets.has_installation
              : flag.key === "is_new"
                ? facets.is_new
                : facets.is_on_sale;
          if (!count) return null;
          return (
            <Checkbox
              key={flag.key}
              label={flag.label}
              count={count}
              checked={flags.has(flag.key)}
              onChange={(e) => toggleFlag(flag.key, e.target.checked)}
            />
          );
        })}
      </section>
    </aside>
  );
}
