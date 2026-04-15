import clsx from "clsx";
import { formatPriceLabel } from "@/lib/format";
import type { ProductPricingMode } from "@/types/database";

type Size = "sm" | "md" | "lg";

type PriceTagProps = {
  price: number;
  priceFrom?: boolean;
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

export default function PriceTag({
  price,
  priceFrom,
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

  return (
    <div className={clsx("flex flex-col", className)}>
      <span
        className={clsx(
          "font-display font-bold leading-none text-brand-orange tabular-nums",
          sizeMap[size],
        )}
      >
        {formatPriceLabel({ price, priceFrom, unit })}
      </span>
      {pricingMode === "calculator" && (
        <span className="text-xs font-medium text-neutral-500">
          Стартовая цена, финальная — в калькуляторе
        </span>
      )}
    </div>
  );
}
