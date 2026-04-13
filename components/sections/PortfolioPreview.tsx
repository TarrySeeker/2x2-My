'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Layers, Sparkles, Bus, LayoutGrid, Briefcase } from 'lucide-react'
import Button from '@/components/ui/Button'

const alsoWeDo = [
  {
    icon: Sparkles,
    title: 'Архитектурная подсветка и вывески',
    bullets: [
      'Разработка эскизов, согласование',
      'Подбор оборудования и монтаж элементов архитектурной подсветки здания',
      'Изготовление вывесок, монтаж',
    ],
    cardGradient: 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400',
    iconGradient: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/45',
    listBorder: 'border-l-orange-400/90',
    bullet: 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_10px_rgba(251,146,60,0.65)]',
    stepOuter: 'bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 p-[2px] shadow-md shadow-orange-400/40',
    glow: 'shadow-orange-500/35 hover:shadow-orange-500/50',
  },
  {
    icon: Bus,
    title: 'Городской транспорт',
    bullets: ['Оформление городских автобусов', 'Оклейка пленкой', 'Подсветка'],
    cardGradient: 'bg-gradient-to-br from-fuchsia-600 via-brand-orange to-cyan-500',
    iconGradient: 'bg-gradient-to-br from-fuchsia-600 to-cyan-600 text-white shadow-lg shadow-fuchsia-500/40',
    listBorder: 'border-l-fuchsia-400/85',
    bullet: 'bg-gradient-to-r from-fuchsia-500 to-cyan-400 shadow-[0_0_10px_rgba(217,70,239,0.55)]',
    stepOuter: 'bg-gradient-to-br from-fuchsia-500 via-orange-500 to-cyan-400 p-[2px] shadow-md shadow-fuchsia-500/35',
    glow: 'shadow-fuchsia-500/30 hover:shadow-cyan-500/35',
  },
  {
    icon: LayoutGrid,
    title: 'Таблички и оформление',
    bullets: ['Таблички', 'Аппликация на стекла', 'Фон лифтовых зон'],
    cardGradient: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500',
    iconGradient: 'bg-gradient-to-br from-emerald-600 to-sky-600 text-white shadow-lg shadow-emerald-500/40',
    listBorder: 'border-l-emerald-400/90',
    bullet: 'bg-gradient-to-r from-emerald-500 to-sky-400 shadow-[0_0_10px_rgba(20,184,166,0.55)]',
    stepOuter: 'bg-gradient-to-br from-emerald-400 via-teal-400 to-sky-400 p-[2px] shadow-md shadow-teal-500/35',
    glow: 'shadow-emerald-500/30 hover:shadow-sky-500/40',
  },
] as const

export default function PortfolioPreview() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="section-padding relative overflow-hidden bg-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,107,0,0.07),transparent_55%)]"
        aria-hidden
      />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={isInView ? { scale: 1 } : {}}
            transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-orange/15 px-5 py-2 text-sm font-bold text-brand-orange"
          >
            <Layers className="h-4 w-4" />
            Портфолио
          </motion.div>
          <h2 className="mb-4 text-3xl font-black text-brand-dark sm:text-4xl md:text-6xl">
            Наши{' '}
            <span className="bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange bg-clip-text text-transparent">
              работы
            </span>
          </h2>
          <p className="mx-auto mb-8 max-w-lg text-base text-gray-600 sm:text-lg">
            Кейсы с фото и фильтром по направлениям — в разделе «Портфолио». Здесь — кратко о спектре услуг ниже.
          </p>
          <Button href="/portfolio" variant="outline" size="lg" className="shrink-0">
            Перейти в портфолио
          </Button>
        </motion.div>

        <div className="mt-14 border-t border-gray-200 pt-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="mb-10 text-center md:mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : {}}
              transition={{ duration: 0.5, type: 'spring', stiffness: 200, delay: 0.2 }}
              className="mb-6 inline-flex rounded-full bg-gradient-to-r from-brand-orange via-amber-400 to-fuchsia-500 p-[2px] shadow-lg shadow-brand-orange/30"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white to-orange-50/90 px-5 py-2 text-sm font-bold text-brand-orange backdrop-blur-sm">
                <Briefcase className="h-4 w-4" />
                Спектр услуг
              </span>
            </motion.div>
            <h2 className="mb-4 text-3xl font-black text-brand-dark sm:text-4xl md:text-5xl">
              Также мы{' '}
              <span className="bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange bg-clip-text text-transparent">
                занимаемся
              </span>
            </h2>
            <p className="mx-auto max-w-lg text-base text-gray-600 sm:text-lg">
              Полный спектр работ под ключ
            </p>
          </motion.div>
          <div className="relative mx-auto max-w-2xl">
            <div
              className="pointer-events-none absolute bottom-10 left-[19px] top-5 w-[3px] rounded-full bg-gradient-to-b from-orange-400 via-brand-orange to-violet-500 opacity-80 shadow-[0_0_12px_rgba(255,107,0,0.35)] md:left-[22px]"
              aria-hidden
            />
            <ol className="relative list-none space-y-0 p-0">
              {alsoWeDo.map((block, i) => {
                const Icon = block.icon
                const isLast = i === alsoWeDo.length - 1
                return (
                  <li
                    key={block.title}
                    className={`relative flex gap-5 md:gap-7 ${isLast ? 'pb-0' : 'pb-12 md:pb-14'}`}
                  >
                    <div className="relative z-10 flex w-10 shrink-0 justify-center md:w-11">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.6 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true, margin: '-60px' }}
                        transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 18 }}
                        className={`rounded-full ${block.stepOuter}`}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-brand-dark ring-2 ring-white/90 md:h-10 md:w-10 md:text-base">
                          {i + 1}
                        </span>
                      </motion.div>
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 28 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
                      whileHover={{
                        y: -6,
                        scale: 1.01,
                        transition: { type: 'spring', stiffness: 380, damping: 22 },
                      }}
                      className={`group min-w-0 flex-1 rounded-2xl ${block.cardGradient} p-[2px] shadow-lg ${block.glow} transition-shadow duration-300`}
                    >
                      <div className="rounded-[15px] bg-white/98 p-5 backdrop-blur-sm md:rounded-2xl md:p-7">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                          <span className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${block.iconGradient} sm:mx-0`}>
                            <Icon className="h-6 w-6" strokeWidth={2} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="mb-3 text-center text-lg font-bold leading-snug text-brand-dark sm:text-left md:text-xl">
                              {block.title}
                            </h3>
                            <ul className={`space-y-2.5 border-l-2 pl-4 sm:pl-5 ${block.listBorder}`}>
                              {block.bullets.map((line, j) => (
                                <motion.li
                                  key={line}
                                  initial={{ opacity: 0, x: -8 }}
                                  whileInView={{ opacity: 1, x: 0 }}
                                  viewport={{ once: true, margin: '-30px' }}
                                  transition={{ duration: 0.35, delay: 0.05 + j * 0.06 }}
                                  className="flex gap-3 text-sm leading-relaxed text-gray-600 md:text-[15px]"
                                >
                                  <span
                                    className={`mt-2 h-2 w-2 shrink-0 rounded-full ${block.bullet}`}
                                    aria-hidden
                                  />
                                  <span>{line}</span>
                                </motion.li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
