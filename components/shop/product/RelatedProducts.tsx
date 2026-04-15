import ProductCard from "@/components/shop/catalog/ProductCard";
import type { Product } from "@/types";
import type { CatalogListItem } from "@/lib/data/catalog-demo";

type RelatedProductsProps = {
  products: Product[];
};

const toListItem = (p: Product): CatalogListItem => ({
  id: p.id,
  category_id: p.category_id,
  name: p.name,
  slug: p.slug,
  short_description: p.short_description,
  pricing_mode: p.pricing_mode,
  price: Number(p.price),
  price_from: p.price_from,
  unit: p.unit,
  is_featured: p.is_featured,
  is_new: p.is_new,
  has_installation: p.has_installation,
  rating_avg: Number(p.rating_avg),
  reviews_count: p.reviews_count,
  image_url: null,
  category_slug: null,
  category_name: null,
  total_count: 0,
});

export default function RelatedProducts({ products }: RelatedProductsProps) {
  if (!products.length) return null;
  return (
    <section className="flex flex-col gap-5">
      <h2 className="font-display text-2xl font-bold text-brand-dark sm:text-3xl">
        Похожие услуги
      </h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={toListItem(p)} />
        ))}
      </div>
    </section>
  );
}
