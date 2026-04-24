import Badge from "@/components/ui/Badge";
import { Star, Clock, Truck } from "lucide-react";
import clsx from "clsx";
import PriceTag from "@/components/shop/catalog/PriceTag";
import OneClickCtaButton from "@/components/shop/product/OneClickCtaButton";
import QuoteCtaButton from "@/components/shop/product/QuoteCtaButton";
import type { ProductWithRelations } from "@/types";

type ProductInfoProps = {
  product: ProductWithRelations;
  className?: string;
};

export default function ProductInfo({ product, className }: ProductInfoProps) {
  return (
    <div className={clsx("flex flex-col gap-5", className)}>
      <div className="flex flex-wrap gap-2">
        {product.is_new && <Badge variant="orange">Новинка</Badge>}
        {product.is_featured && <Badge variant="dark">Хит продаж</Badge>}
        {product.has_installation && <Badge variant="info">С монтажом</Badge>}
        {product.category?.name && (
          <Badge variant="gray">{product.category.name}</Badge>
        )}
      </div>

      <h1 className="font-display text-3xl font-bold leading-tight text-brand-dark sm:text-4xl">
        {product.name}
      </h1>

      {product.short_description && (
        <p className="text-base leading-relaxed text-neutral-600">
          {product.short_description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-5 text-sm">
        {product.rating_avg > 0 && (
          <div className="inline-flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-brand-orange text-brand-orange" />
            <span className="font-semibold text-brand-dark">
              {product.rating_avg.toFixed(1)}
            </span>
            <span className="text-neutral-500">
              · {product.reviews_count} отзыв
              {product.reviews_count === 1 ? "" : "ов"}
            </span>
          </div>
        )}
        {product.lead_time_days && (
          <div className="inline-flex items-center gap-1.5 text-neutral-500">
            <Clock className="h-4 w-4" />
            <span>Срок: {product.lead_time_days} дн</span>
          </div>
        )}
        {product.has_installation && (
          <div className="inline-flex items-center gap-1.5 text-neutral-500">
            <Truck className="h-4 w-4" />
            <span>Монтаж в ХМАО/ЯНАО</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white/60 p-5 backdrop-blur">
        <PriceTag
          price={product.price}
          priceTo={product.price_to}
          oldPrice={product.old_price}
          unit={product.unit}
          pricingMode={product.pricing_mode}
          size="lg"
        />
      </div>

      {product.pricing_mode === "fixed" && (
        <OneClickCtaButton
          productId={product.id}
          productName={product.name}
          productSlug={product.slug}
          productImageUrl={product.images[0]?.url ?? null}
        />
      )}
      {product.pricing_mode === "quote" && (
        <QuoteCtaButton
          productId={product.id}
          productName={product.name}
          productSlug={product.slug}
          categoryId={product.category_id}
        />
      )}
    </div>
  );
}
