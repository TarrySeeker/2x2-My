'use client'

import { useEffect, useState, useMemo, createElement } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { asset } from '@/lib/asset'
import { resolveIcon } from '@/lib/cms/icon-map'

export interface AboutStat {
  icon: string
  value: number | string
  suffix?: string
  label: string
}

export interface AboutHighlightCard {
  text: string
  icon?: string
}

export interface AboutSectionData {
  badge: string
  headline: string
  paragraphs: string[]
  highlight_card: AboutHighlightCard | null
  stats: AboutStat[]
  cta_text: string
  cta_url: string
}

const STAT_GRADIENTS = [
  'from-orange-500 to-amber-400',
  'from-brand-orange to-red-500',
  'from-amber-500 to-orange-500',
  'from-orange-600 to-amber-500',
  'from-rose-500 to-orange-500',
  'from-amber-400 to-yellow-500',
] as const

function FloatingOrb({ className, delay }: { className: string; delay: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl ${className}`}
      animate={{
        y: [0, -30, 0, 20, 0],
        x: [0, 15, -10, 5, 0],
        scale: [1, 1.1, 0.95, 1.05, 1],
      }}
      transition={{ duration: 8, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  )
}

function AnimatedCounter({
  value,
  suffix,
  className,
}: {
  value: number | string
  suffix: string
  className?: string
}) {
  const numericTarget = typeof value === 'number' ? value : Number(String(value).replace(/\D/g, ''))
  const isNumeric = Number.isFinite(numericTarget) && numericTarget > 0
  const [count, setCount] = useState(isNumeric ? 0 : numericTarget || 0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!started || !isNumeric) return
    let start = 0
    const step = Math.max(1, Math.floor(numericTarget / 50))
    const interval = setInterval(() => {
      start += step
      if (start >= numericTarget) {
        setCount(numericTarget)
        clearInterval(interval)
      } else {
        setCount(start)
      }
    }, 25)
    return () => clearInterval(interval)
  }, [started, numericTarget, isNumeric])

  if (!isNumeric) {
    return (
      <span className={className ?? 'tabular-nums'}>
        {String(value)}
        {suffix}
      </span>
    )
  }

  return (
    <motion.span
      className={className ?? 'tabular-nums'}
      onViewportEnter={() => setStarted(true)}
      viewport={{ once: true, margin: '-50px' }}
    >
      {count}
      {suffix}
    </motion.span>
  )
}

/**
 * Статичная карточка «Мы вас понимаем» (ранее был HighlightSlider с
 * 4 ротирующимися карточками — упрощено по решению клиента, master-plan
 * правка 1).
 */
function StaticHighlightCard({ card }: { card: AboutHighlightCard }) {
  const iconComponent = useMemo(() => resolveIcon(card.icon || 'UserCheck'), [card.icon])
  return (
    <motion.div
      initial={{ opacity: 1, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="mb-10"
    >
      <div className="flex items-center justify-center px-2 sm:px-0">
        <div className="inline-flex max-w-[min(100%,22rem)] items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-orange via-orange-500 to-amber-500 px-5 py-4 text-base font-bold text-white shadow-xl shadow-brand-orange/25 sm:max-w-none sm:gap-4 sm:px-8 sm:py-5 sm:text-lg md:text-xl lg:text-2xl">
          {createElement(iconComponent, { className: 'h-7 w-7 sm:h-8 sm:w-8' })}
          {card.text}
        </div>
      </div>
    </motion.div>
  )
}

export default function AboutPreviewClient({ data }: { data: AboutSectionData }) {
  return (
    <section className="section-padding bg-white relative overflow-hidden">
      <FloatingOrb
        className="w-[400px] h-[400px] bg-brand-orange/5 top-0 left-0 -translate-x-1/2 -translate-y-1/2"
        delay={0}
      />
      <FloatingOrb
        className="w-[300px] h-[300px] bg-amber-500/5 bottom-0 right-0 translate-x-1/3 translate-y-1/3"
        delay={2}
      />
      <FloatingOrb
        className="w-[200px] h-[200px] bg-orange-500/5 top-1/2 right-1/4"
        delay={4}
      />

      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {data.badge && (
            <motion.span
              initial={{ opacity: 1, y: -15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-brand-orange text-white px-5 py-2 rounded-full text-sm font-bold mb-8 shadow-lg shadow-brand-orange/30"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              {data.badge}
            </motion.span>
          )}

          <motion.h2
            initial={{ opacity: 1, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-brand-dark mb-8 leading-[1.05]"
          >
            {/* Чтобы сохранить визуальный вес лого 2×2 как часть заголовка — выводим
                его справа, если в headline есть слово "2×2" / "2x2", или просто
                прицепляем как иконку к тексту. Иначе — обычный текстовый заголовок. */}
            <span>{data.headline}</span>{' '}
            <motion.span
              className="inline-block align-middle"
              whileInView={{ scale: [1, 1.06, 1] }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <Image
                src={asset('/img/log-2.png')}
                alt="2×2"
                width={280}
                height={90}
                className="h-[0.92em] w-auto max-h-14 object-contain object-bottom sm:max-h-16 md:max-h-[4.5rem]"
                sizes="(max-width: 768px) 200px, 280px"
              />
            </motion.span>
          </motion.h2>

          {data.paragraphs.map((p, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 1, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              className={`whitespace-pre-line text-gray-600 text-xl md:text-2xl leading-relaxed ${
                i === data.paragraphs.length - 1 ? 'mb-10' : 'mb-5'
              }`}
            >
              {p}
            </motion.p>
          ))}

          {data.highlight_card && (
            <StaticHighlightCard card={data.highlight_card} />
          )}

          {data.cta_text && data.cta_url && (
            <motion.div
              initial={{ opacity: 1, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Link href={data.cta_url} className="group relative inline-flex items-center gap-3 rounded-xl overflow-hidden">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  className="inline-flex items-center gap-3 bg-brand-orange text-white px-9 py-4.5 rounded-xl
                    font-bold text-lg shadow-lg shadow-brand-orange/30 hover:shadow-xl hover:shadow-brand-orange/40 transition-all duration-300"
                >
                  {data.cta_text}
                  <motion.span
                    className="inline-block"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.span>
                </motion.span>
              </Link>
            </motion.div>
          )}
        </div>

        {data.stats.length > 0 && (
          <motion.div
            initial={{ opacity: 1, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4 md:gap-x-0 md:gap-y-0 md:divide-x md:divide-gray-200/80"
          >
            {data.stats.map((stat, i) => {
              const Icon = resolveIcon(stat.icon)
              const gradient = STAT_GRADIENTS[i % STAT_GRADIENTS.length]
              return (
                <motion.div
                  key={`${stat.label}-${i}`}
                  initial={{ opacity: 1, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.45, delay: 0.45 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="group flex flex-col items-center px-2 text-center md:px-6 lg:px-8"
                >
                  <div
                    className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-6 md:h-11 md:w-11 ${gradient}`}
                  >
                    <Icon className="h-5 w-5 md:h-5 md:w-5" strokeWidth={2.25} />
                  </div>
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix ?? ''}
                    className={`mb-2 block bg-gradient-to-br bg-clip-text font-black tabular-nums text-4xl leading-none text-transparent transition-transform duration-300 ease-out group-hover:scale-[1.03] md:text-5xl lg:text-6xl ${gradient}`}
                  />
                  <p className="max-w-[10.5rem] text-pretty text-sm font-semibold leading-snug text-neutral-600 transition-colors duration-300 group-hover:text-brand-dark md:max-w-none md:text-base">
                    {stat.label}
                  </p>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>
    </section>
  )
}
