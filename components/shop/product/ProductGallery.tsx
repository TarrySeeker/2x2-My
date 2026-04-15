"use client";

import Image from "next/image";
import { useState } from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import type { ProductImage } from "@/types";

type ProductGalleryProps = {
  images: ProductImage[];
  productName: string;
};

const SOFT_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const safe = images.length
    ? images
    : ([
        {
          id: 0,
          product_id: 0,
          url: "",
          alt_text: productName,
          sort_order: 0,
          is_primary: true,
          created_at: "",
        },
      ] as ProductImage[]);

  const [active, setActive] = useState(0);
  const current = safe[active] ?? safe[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
        <AnimatePresence mode="wait">
          {current?.url ? (
            <motion.div
              key={current.id}
              className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: SOFT_OUT }}
            >
              <Image
                src={current.url}
                alt={current.alt_text ?? productName}
                fill
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
                className="object-cover"
              />
            </motion.div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-neutral-400">
              Фото скоро появится
            </div>
          )}
        </AnimatePresence>
      </div>

      {safe.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {safe.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={clsx(
                "relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                i === active
                  ? "border-brand-orange shadow-md"
                  : "border-neutral-200 hover:border-neutral-300",
              )}
              aria-label={`Показать фото ${i + 1}`}
            >
              {img.url && (
                <Image
                  src={img.url}
                  alt={img.alt_text ?? productName}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
