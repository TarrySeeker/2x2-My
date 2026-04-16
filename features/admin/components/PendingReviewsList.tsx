"use client";

import { Star } from "lucide-react";
import type { Row } from "@/lib/supabase/table-types";
import clsx from "clsx";

type ReviewRow = Row<"reviews">;

interface PendingReviewsListProps {
  reviews: ReviewRow[];
}

export default function PendingReviewsList({
  reviews,
}: PendingReviewsListProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border",
        "bg-white/80 border-black/5 backdrop-blur-xl",
        "dark:bg-white/[0.04] dark:border-white/10",
      )}
    >
      <div className="px-6 py-4">
        <h3 className="text-sm font-semibold text-brand-dark dark:text-white">
          На модерации
        </h3>
      </div>

      {reviews.length === 0 ? (
        <div className="px-6 pb-6 text-sm text-neutral-400">
          Нет отзывов на модерации
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-white/5">
          {reviews.map((r) => (
            <li key={r.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-brand-dark dark:text-neutral-200">
                  {r.author_name}
                </p>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={clsx(
                        "h-3.5 w-3.5",
                        i < r.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-neutral-200 dark:text-neutral-600",
                      )}
                    />
                  ))}
                </div>
              </div>
              {r.text && (
                <p className="mt-1.5 line-clamp-2 text-sm text-neutral-500 dark:text-neutral-400">
                  {r.text}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
