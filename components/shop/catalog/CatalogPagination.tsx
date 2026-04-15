"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

type CatalogPaginationProps = {
  page: number;
  pageCount: number;
  className?: string;
};

function buildPages(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let d = -1; d <= 1; d++) {
    const p = current + d;
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push("gap");
    out.push(sorted[i]);
  }
  return out;
}

export default function CatalogPagination({
  page,
  pageCount,
  className,
}: CatalogPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  if (pageCount <= 1) return null;

  const go = (next: number) => {
    if (next < 1 || next > pageCount || next === page) return;
    const sp = new URLSearchParams(params?.toString() ?? "");
    if (next === 1) sp.delete("page");
    else sp.set("page", String(next));
    const query = sp.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const pages = buildPages(page, pageCount);

  return (
    <nav
      aria-label="Пагинация"
      className={clsx(
        "flex items-center justify-center gap-1.5 pt-4",
        pending && "opacity-70",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="Предыдущая страница"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-brand-dark transition-colors hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, i) =>
        p === "gap" ? (
          <span
            key={`gap-${i}`}
            className="inline-flex h-10 w-10 items-center justify-center text-sm text-neutral-400"
          >
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            aria-current={p === page ? "page" : undefined}
            className={clsx(
              "inline-flex h-10 min-w-10 items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors",
              p === page
                ? "bg-brand-orange text-white shadow-sm"
                : "border border-neutral-200 bg-white text-brand-dark hover:border-brand-orange hover:text-brand-orange",
            )}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= pageCount}
        aria-label="Следующая страница"
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-200 bg-white text-brand-dark transition-colors hover:border-brand-orange hover:text-brand-orange disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
