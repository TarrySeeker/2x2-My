import clsx from "clsx";
import ProductCard from "./ProductCard";
import type { CatalogListItem } from "@/lib/data/catalog-demo";

type CatalogGridProps = {
  products: CatalogListItem[];
  className?: string;
};

export default function CatalogGrid({ products, className }: CatalogGridProps) {
  return (
    <div
      className={clsx(
        "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
