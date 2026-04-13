'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Clock, Star, Users, type LucideIcon } from 'lucide-react'

type ValueTheme = {
  cardGradient: string
  iconGradient: string
  glow: string
}

/** Те же градиенты и тени, что у плашек «Также мы занимаемся» в PortfolioPreview */
const themes: ValueTheme[] = [
  {
    cardGradient: 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400',
    iconGradient: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/45',
    glow: 'shadow-orange-500/35 sm:hover:shadow-orange-500/50',
  },
  {
    cardGradient: 'bg-gradient-to-br from-fuchsia-600 via-brand-orange to-cyan-500',
    iconGradient: 'bg-gradient-to-br from-fuchsia-600 to-cyan-600 text-white shadow-lg shadow-fuchsia-500/40',
    glow: 'shadow-fuchsia-500/30 sm:hover:shadow-cyan-500/35',
  },
  {
    cardGradient: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500',
    iconGradient: 'bg-gradient-to-br from-emerald-600 to-sky-600 text-white shadow-lg shadow-emerald-500/40',
    glow: 'shadow-emerald-500/30 sm:hover:shadow-sky-500/40',
  },
  {
    cardGradient: 'bg-gradient-to-br from-rose-500 via-orange-500 to-amber-400',
    iconGradient: 'bg-gradient-to-br from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-500/40',
    glow: 'shadow-rose-500/30 sm:hover:shadow-amber-500/45',
  },
]

const values: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Star, title: 'Качество', description: 'Не идём на компромисс с качеством материалов и исполнения.' },
  { icon: Clock, title: 'Сроки', description: 'Всегда укладываемся в дедлайн, даже при срочных заказах.' },
  { icon: Heart, title: 'Отношение', description: 'К каждому клиенту — индивидуальный подход.' },
  { icon: Users, title: 'Команда', description: 'Опытные специалисты на каждом этапе: дизайн, производство, монтаж.' },
]

function useFinePointerHover() {
  const [ok, setOk] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const run = () => setOk(mq.matches)
    run()
    mq.addEventListener('change', run)
    return () => mq.removeEventListener('change', run)
  }, [])
  return ok
}

export default function AboutValues() {
  const hoverMotion = useFinePointerHover()

  return (
    <section className="section-padding bg-brand-gray">
      <div className="container min-w-0">
        <div className="mb-14 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl font-black text-brand-dark sm:text-4xl md:text-6xl"
          >
            Наши{' '}
            <span className="bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange bg-clip-text text-transparent">
              ценности
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
            className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500 sm:mt-5 sm:text-lg"
          >
            То, что отличает нас от других агентств
          </motion.p>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 min-[480px]:gap-5 xl:grid-cols-4 xl:gap-6">
          {values.map((v, i) => {
            const Icon = v.icon
            const t = themes[i % themes.length]!
            return (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-24px 0px -40px 0px' }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: Math.min(i * 0.06, 0.24) }}
                whileHover={
                  hoverMotion
                    ? { y: -5, scale: 1.01, transition: { type: 'spring', stiffness: 380, damping: 22 } }
                    : undefined
                }
                className={`group flex min-h-0 min-w-0 rounded-2xl ${t.cardGradient} p-[2px] shadow-lg ${t.glow} transition-shadow duration-300`}
              >
                <div className="flex min-h-0 min-w-0 flex-1 flex-col rounded-[14px] bg-white/98 p-4 backdrop-blur-sm sm:rounded-[15px] sm:p-5 md:rounded-2xl md:p-6 lg:p-7">
                  <div className="flex min-h-0 min-w-0 flex-1 flex-row items-start gap-3.5 sm:gap-4 md:gap-5">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12 sm:rounded-xl ${t.iconGradient}`}
                    >
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
                    </span>
                    <div className="min-h-0 min-w-0 flex-1">
                      <h3 className="mb-3 text-left text-xl font-black text-brand-dark sm:mb-4 sm:text-2xl md:text-3xl">
                        {v.title}
                      </h3>
                      <p className="text-base leading-relaxed text-gray-500 md:text-lg">{v.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
