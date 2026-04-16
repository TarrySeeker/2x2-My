import Image from "next/image";
import type { TopProduct } from "@/features/admin/types";
import clsx from "clsx";

interface TopProductsListProps {
  products: TopProduct[];
}

function formatRub(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TopProductsList({ products }: TopProductsListProps) {
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
          Топ товаров
        </h3>
      </div>

      {products.length === 0 ? (
        <div className="px-6 pb-6 text-sm text-neutral-400">Нет данных</div>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-white/5">
          {products.map((p, i) => (
            <li key={p.id} className="flex items-center gap-4 px-6 py-3">
              <span className="w-5 text-center text-xs font-bold text-neutral-400">
                {i + 1}
              </span>
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-white/10">
                {p.image_url ? (
                  <Image
                    src={p.image_url}
                    alt={p.name}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                    ?
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-brand-dark dark:text-neutral-200">
                  {p.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {p.sold} продано
                </p>
              </div>
              <p className="text-sm font-semibold text-brand-dark dark:text-white">
                {formatRub(p.revenue)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
