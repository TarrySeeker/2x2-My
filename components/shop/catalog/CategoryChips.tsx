"use client";

import Link from "next/link";
import clsx from "clsx";
import type { CategoryTreeItem } from "@/types";

type CategoryChipsProps = {
  categories: CategoryTreeItem[];
  activeSlug?: string | null;
  className?: string;
};

export default function CategoryChips({
  categories,
  activeSlug,
  className,
}: CategoryChipsProps) {
  const chips = categories.filter((c) => c.depth === 0);
  return (
    <div
      className={clsx(
        "scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:px-0",
        className,
      )}
      role="list"
    >
      <Link
        href="/catalog"
        className={clsx(
          "snap-start whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
          !activeSlug
            ? "border-brand-orange bg-brand-orange text-white"
            : "border-neutral-200 bg-white text-brand-dark hover:border-brand-orange hover:text-brand-orange",
        )}
        role="listitem"
      >
        Все услуги
      </Link>
      {chips.map((cat) => {
        const active = cat.slug === activeSlug;
        return (
          <Link
            key={cat.id}
            href={`/catalog/${cat.slug}`}
            className={clsx(
              "snap-start whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "border-brand-orange bg-brand-orange text-white"
                : "border-neutral-200 bg-white text-brand-dark hover:border-brand-orange hover:text-brand-orange",
            )}
            role="listitem"
          >
            {cat.name}
            {typeof cat.products_count === "number" && (
              <span
                className={clsx(
                  "ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-neutral-100 text-neutral-500",
                )}
              >
                {cat.products_count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
