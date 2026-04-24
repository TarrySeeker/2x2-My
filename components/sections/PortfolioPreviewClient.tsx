'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Layers, ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import { asset } from '@/lib/asset'

export interface FeaturedWork {
  id: number
  title: string
  slug: string
  short_description: string | null
  category_label: string | null
  location: string | null
  cover_url: string | null
}

export interface PortfolioSectionData {
  headline: string
  subheadline: string
  more_button_text: string
  more_button_url: string
}

export default function PortfolioPreviewClient({
  section,
  works,
}: {
  section: PortfolioSectionData
  works: FeaturedWork[]
}) {
  if (works.length === 0) {
    // Если в админке ничего не помечено и stub-fallback тоже пуст —
    // секцию не рендерим. Это аккуратнее, чем «заглушка работ».
    return null
  }

  return (
    <section className="section-padding relative overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,107,0,0.07),transparent_55%)]"
        aria-hidden
      />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-orange/15 px-5 py-2 text-sm font-bold text-brand-orange"
          >
            <Layers className="h-4 w-4" />
            Портфолио
          </motion.div>
          <h2 className="mb-4 text-3xl font-black text-brand-dark sm:text-4xl md:text-6xl">
            {section.headline.split(' ').map((word, i, arr) => {
              const isLast = i === arr.length - 1
              return (
                <span key={i}>
                  {isLast ? (
                    <span className="bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange bg-clip-text text-transparent">
                      {word}
                    </span>
                  ) : (
                    <>{word} </>
                  )}
                </span>
              )
            })}
          </h2>
          {section.subheadline && (
            <p className="mx-auto max-w-2xl text-base text-gray-600 sm:text-lg">{section.subheadline}</p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {works.map((w, i) => (
            <motion.article
              key={w.id}
              initial={{ opacity: 1, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6, transition: { type: 'spring', stiffness: 380, damping: 22 } }}
              className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow duration-300 hover:shadow-xl"
            >
              <Link href={`/portfolio/${w.slug}`} className="block">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                  {w.cover_url ? (
                    <Image
                      src={asset(w.cover_url)}
                      alt={w.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300">
                      <Layers className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-transparent" />
                  {w.category_label && (
                    <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-brand-orange shadow-sm backdrop-blur-sm">
                      {w.category_label}
                    </span>
                  )}
                  {w.location && (
                    <span className="absolute bottom-4 left-4 text-xs font-semibold text-white/90">
                      {w.location}
                    </span>
                  )}
                </div>
                <div className="p-5 md:p-6">
                  <h3 className="mb-2 line-clamp-2 text-base font-bold leading-snug text-brand-dark group-hover:text-brand-orange md:text-lg">
                    {w.title}
                  </h3>
                  {w.short_description && (
                    <p className="line-clamp-2 text-sm leading-relaxed text-gray-500">
                      {w.short_description}
                    </p>
                  )}
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange">
                    Смотреть проект
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 1, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 flex justify-center"
        >
          <Button
            href={section.more_button_url || '/portfolio'}
            variant="outline"
            size="lg"
            className="rounded-full px-10"
          >
            {section.more_button_text || 'Все работы'}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
