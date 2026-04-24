'use client'

import { motion } from 'framer-motion'
import { resolveIcon } from '@/lib/cms/icon-map'

export interface FeatureItem {
  icon: string
  title: string
  description: string
  extra: string
}

export interface FeaturesSectionData {
  headline: string
  subheadline: string
  items: FeatureItem[]
}

const FEATURE_GRADIENTS = [
  'from-orange-500 to-amber-400',
  'from-amber-500 to-yellow-400',
  'from-orange-600 to-orange-400',
  'from-red-500 to-orange-400',
  'from-rose-500 to-amber-400',
  'from-fuchsia-500 to-orange-400',
] as const

export default function FeaturesSectionClient({ data }: { data: FeaturesSectionData }) {
  return (
    <section className="section-padding relative overflow-hidden bg-brand-dark">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,107,0,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,107,0,0.06),transparent_50%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(255,107,0,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,158,11,0.05) 0%, transparent 50%)',
        }}
      />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 1, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center md:mb-14"
        >
          <h2 className="mb-4 text-3xl font-black text-white md:text-5xl">{data.headline}</h2>
          {data.subheadline && (
            <p className="mx-auto max-w-2xl text-base text-white/70 md:text-lg">{data.subheadline}</p>
          )}
        </motion.div>

        <div className="relative mx-auto max-w-3xl">
          <div
            className="pointer-events-none absolute bottom-6 left-[21px] top-8 w-px bg-gradient-to-b from-brand-orange/70 via-amber-500/40 to-white/10 md:left-[25px]"
            aria-hidden
          />

          <ol className="relative list-none space-y-0 p-0">
            {data.items.map((item, i) => {
              const Icon = resolveIcon(item.icon)
              const isLast = i === data.items.length - 1
              const gradient = FEATURE_GRADIENTS[i % FEATURE_GRADIENTS.length]
              return (
                <li
                  key={`${item.title}-${i}`}
                  className={`relative flex gap-6 md:gap-8 ${isLast ? 'pb-0' : 'pb-10 md:pb-12'}`}
                >
                  <div className="relative z-10 flex w-11 shrink-0 justify-center md:w-12">
                    <motion.div
                      initial={{ opacity: 1, scale: 0.85 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 22 }}
                      className={`rounded-full bg-gradient-to-br p-[2px] shadow-md ${gradient} shadow-black/30`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-dark text-sm font-black text-white ring-2 ring-brand-dark md:h-10 md:w-10 md:text-base">
                        {i + 1}
                      </span>
                    </motion.div>
                  </div>

                  <motion.article
                    initial={{ opacity: 1, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.45, delay: 0.05 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -4 }}
                    className="group min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-white/18 md:p-8"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                      <span
                        className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md ${gradient} text-white shadow-black/25 sm:mx-0`}
                      >
                        <Icon className="h-6 w-6" strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <h3 className="mb-2 text-xl font-black text-white md:text-2xl">{item.title}</h3>
                        {item.description && (
                          <p className="mb-2 text-base leading-relaxed text-white/90 md:text-lg">
                            {item.description}
                          </p>
                        )}
                        {item.extra && (
                          <p className="text-sm leading-relaxed text-white/65 md:text-base">{item.extra}</p>
                        )}
                      </div>
                    </div>
                  </motion.article>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
