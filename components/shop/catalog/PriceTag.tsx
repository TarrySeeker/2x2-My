import clsx from "clsx";
import { formatPriceLabel, formatRub } from "@/lib/format";
import type { ProductPricingMode } from "@/types/database";

type Size = "sm" | "md" | "lg";

type PriceTagProps = {
  /** Нижняя граница диапазона. */
  price: number;
  /** Верхняя граница диапазона. NULL/undefined → «от {price} ₽». */
  priceTo?: number | null;
  /** Старая (зачёркнутая) цена для маркетингового UX. */
  oldPrice?: number | null;
  unit?: string | null;
  pricingMode?: ProductPricingMode;
  size?: Size;
  className?: string;
};

const sizeMap: Record<Size, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-3xl",
};

const oldPriceSizeMap: Record<Size, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
};

export default function PriceTag({
  price,
  priceTo,
  oldPrice,
  unit,
  pricingMode = "fixed",
  size = "md",
  className,
}: PriceTagProps) {
  if (pricingMode === "quote") {
    return (
      <div className={clsx("flex flex-col", className)}>
        <span
          className={clsx(
            "font-display font-bold leading-none text-brand-dark",
            sizeMap[size],
          )}
        >
          По запросу
        </span>
        <span className="text-xs font-medium text-neutral-500">
          Расчёт бесплатно, в течение 1 часа
        </span>
      </div>
    );
  }

  const showOldPrice =
    typeof oldPrice === "number" && oldPrice > price;

  return (
    <div className={clsx("flex flex-col", className)}>
      {showOldPrice && (
        <span
          className={clsx(
            "font-medium leading-none text-neutral-400 line-through tabular-nums",
            oldPriceSizeMap[size],
          )}
        >
          {formatRub(oldPrice as number)} ₽
        </span>
      )}
      <span
        className={clsx(
          "font-display font-bold leading-none text-brand-orange tabular-nums",
          sizeMap[size],
        )}
      >
        {formatPriceLabel({ price, priceTo, unit })}
      </span>
      {pricingMode === "calculator" && (
        <span className="text-xs font-medium text-neutral-500">
          Стартовая цена, финальная — после расчёта менеджером
        </span>
      )}
    </div>
  );
}
