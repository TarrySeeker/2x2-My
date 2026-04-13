'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import AnimatedSection from '@/components/ui/AnimatedSection'
import Badge from '@/components/ui/Badge'
import type { PortfolioItem } from '@/lib/types'
import { featuredPortfolioWorks } from '@/lib/featuredPortfolioWorks'

const categories = ['Все', 'Полиграфия', 'Наружная реклама', 'Фасады'] as const

export default function PortfolioGallery({ items }: { items: PortfolioItem[] }) {
  const [active, setActive] = useState<(typeof categories)[number]>('Все')
  const list = useMemo(() => (items.length > 0 ? items : featuredPortfolioWorks), [items])
  const filtered = active === 'Все' ? list : list.filter(w => w.category === active)

  return (
    <section className="section-padding bg-white">
      <div className="container">
        <div className="flex flex-wrap gap-3 mb-10" aria-label="Фильтр по категориям">
          {categories.map(c => (
            <button
              key={c}
              type="button"
              aria-pressed={active === c}
              onClick={() => setActive(c)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300
                ${active === c ? 'bg-brand-orange text-white' : 'bg-brand-gray text-brand-dark hover:bg-orange-50'}`}
            >
              {c}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-12">В этой категории пока нет работ.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((work, i) => {
              const resolvedSrc =
                work.imageUrl?.trim() ||
                `https://picsum.photos/seed/${encodeURIComponent(work._id)}/600/400`
              const isLocal = resolvedSrc.startsWith('/')

              return (
                <AnimatedSection key={work._id} delay={i * 0.05}>
                  <div className="group rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300">
                    <div className="relative overflow-hidden aspect-[4/3]">
                      {isLocal ? (
                        <Image
                          src={resolvedSrc}
                          alt={work.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolvedSrc}
                          alt={work.title}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute left-3 top-3 max-w-[min(100%-1.5rem,220px)] sm:max-w-[min(100%-1.5rem,260px)]">
                        <Badge className="whitespace-normal break-words">{work.badgeLabel ?? work.category}</Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-brand-dark mb-1 text-sm">{work.title}</h3>
                      {work.description?.trim() ? (
                        <p className="whitespace-pre-line text-gray-500 text-xs">{work.description}</p>
                      ) : null}
                    </div>
                  </div>
                </AnimatedSection>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
