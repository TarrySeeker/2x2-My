import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProductBySlugWithRelations,
  getRelatedProducts,
} from "@/lib/data/catalog";
import Breadcrumbs from "@/components/shop/catalog/Breadcrumbs";
import ProductGallery from "@/components/shop/product/ProductGallery";
import ProductInfo from "@/components/shop/product/ProductInfo";
import ProductCalculator from "@/components/shop/product/ProductCalculator";
import ProductTabs from "@/components/shop/product/ProductTabs";
import RelatedProducts from "@/components/shop/product/RelatedProducts";
import StickyMobileBar from "@/components/shop/product/StickyMobileBar";
import ProductViewTracker from "@/components/shop/product/ProductViewTracker";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlugWithRelations(slug);
  if (!product) return { title: "Услуга не найдена" };
  const title =
    product.seo_title ?? `${product.name} — заказать в «2х2» Ханты-Мансийск`;
  const description =
    product.seo_description ??
    product.short_description ??
    `${product.name}. Стартовые цены, онлайн-расчёт и производство в Ханты-Мансийске.`;
  const image = product.images?.[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title,
      description,
      images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlugWithRelations(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, 4);

  const showCalculator =
    product.pricing_mode === "calculator" ||
    (product.calculator && Array.isArray(product.calculator.fields) &&
      product.calculator.fields.length > 0);

  return (
    <main className="bg-surface-cream pb-24 lg:pb-16">
      <ProductViewTracker slug={product.slug} name={product.name} />
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 md:px-8 lg:py-14">
        <Breadcrumbs
          items={[
            { label: "Главная", href: "/" },
            { label: "Каталог", href: "/catalog" },
            ...(product.category
              ? [
                  {
                    label: product.category.name,
                    href: `/catalog/${product.category.slug}`,
                  },
                ]
              : []),
            { label: product.name },
          ]}
        />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
          <ProductGallery images={product.images} productName={product.name} />

          <div className="flex flex-col gap-6">
            <ProductInfo product={product} />
            {showCalculator && <ProductCalculator product={product} />}
          </div>
        </div>

        <ProductTabs product={product} />

        {related.length > 0 && <RelatedProducts products={related} />}
      </div>

      <StickyMobileBar product={product} />
    </main>
  );
}
