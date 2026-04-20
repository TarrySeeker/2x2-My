import type { Row } from "@/lib/db/table-types";
import clsx from "clsx";

type ProductRow = Row<"products">;

interface LowStockListProps {
  products: ProductRow[];
}

export default function LowStockList({ products }: LowStockListProps) {
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
          Мало на складе
        </h3>
      </div>

      {products.length === 0 ? (
        <div className="px-6 pb-6 text-sm text-neutral-400">
          Все товары в наличии
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 dark:divide-white/5">
          {products.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-6 py-3">
              <p className="truncate text-sm text-brand-dark dark:text-neutral-200">
                {p.name}
              </p>
              <span
                className={clsx(
                  "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold",
                  p.stock === 0
                    ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
                )}
              >
                {p.stock} шт.
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
