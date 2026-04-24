"use client";

import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Badge from "@/components/ui/Badge";
import PriceTag from "./PriceTag";
import type { CatalogListItem } from "@/lib/data/catalog-demo";

type ProductCardProps = {
  product: CatalogListItem;
  priority?: boolean;
  className?: string;
};

const SOFT_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const CTA_LABEL: Record<CatalogListItem["pricing_mode"], string> = {
  fixed: "Подробнее",
  calculator: "Рассчитать",
  quote: "Получить расчёт",
};

export default function ProductCard({
  product,
  priority,
  className,
}: ProductCardProps) {
  const reduce = useReducedMotion();
  const href = `/product/${product.slug}`;

  return (
    <motion.article
      // P1-6 (повтор 2026-04-24): в WebKit IntersectionObserver иногда не
      // срабатывает вовремя — карточка остаётся с opacity: 0 и выглядит
      // полупрозрачно/мутно. Гарантируем видимость через initial: opacity: 1.
      // Анимация — только для transform (y-слайд).
      initial={reduce ? false : { opacity: 1, y: 16 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: SOFT_OUT }}
      whileHover={reduce ? undefined : { y: -4 }}
      className={clsx(
        "group relative flex h-[420px] flex-col overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-sm transition-shadow hover:shadow-xl",
        className,
      )}
      // Ранее на карточку клался noise SVG через backgroundImage. В WebKit
      // (Safari) SVG-шум с feTurbulence рендерится сильно плотнее, чем в
      // Chromium/FF — из-за этого карточки выглядели полупрозрачно-мутно.
      // QA 2026-04-24 P1-6: убираем текстуру из самой карточки
      // (плотный белый фон + тонкий border и так обеспечивают нужный контраст).
    >
      <Link
        href={href}
        className="relative h-52 overflow-hidden rounded-t-2xl bg-neutral-100"
      >
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={priority}
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Нет изображения
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap gap-2">
          {product.is_new && <Badge variant="orange">Новое</Badge>}
          {product.is_featured && <Badge variant="dark">Хит</Badge>}
          {product.has_installation && (
            <Badge variant="info">С монтажом</Badge>
          )}
        </div>

        <span className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brand-dark shadow-md backdrop-blur-sm transition-all duration-300 group-hover:bg-brand-orange group-hover:text-white">
          <ArrowUpRight className="h-5 w-5" aria-hidden />
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {product.category_name && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
            {product.category_name}
          </span>
        )}

        <Link
          href={href}
          className="font-display text-lg font-bold leading-tight text-brand-dark transition-colors hover:text-brand-orange line-clamp-2"
        >
          {product.name}
        </Link>

        {product.short_description && (
          <p className="flex-1 text-sm leading-relaxed text-neutral-600 line-clamp-3">
            {product.short_description}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <PriceTag
            price={product.price}
            priceTo={product.price_to}
            unit={product.unit}
            pricingMode={product.pricing_mode}
            size="md"
          />
          <Link
            href={href}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-orange px-4 text-sm font-semibold text-white shadow-sm transition-all duration-300 hover:bg-orange-600 hover:shadow-md"
          >
            {CTA_LABEL[product.pricing_mode]}
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
