'use client'

import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { Briefcase } from 'lucide-react'
import AnimatedSection from '@/components/ui/AnimatedSection'
import Button from '@/components/ui/Button'
import { asset } from '@/lib/asset'
import { useUIStore } from '@/store/ui'
import { trackEvent } from '@/lib/analytics'
import { resolveIcon } from '@/lib/cms/icon-map'

export interface ServiceItem {
  icon: string
  title: string
  description: string
  badge: string
  image: string
  width: string
  height: string
  cta_text?: string
}

export interface AlsoWeDoItem {
  icon: string
  title: string
  bullets: string[]
}

export interface ServicesSectionData {
  headline: string
  subheadline: string
  items: ServiceItem[]
  also_we_do_text: string
  also_we_do_subtitle: string
  also_we_do_items: AlsoWeDoItem[]
}

const ALSO_GRADIENTS = [
  {
    cardGradient: 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400',
    iconGradient: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/45',
    listBorder: 'border-l-orange-400/90',
    bullet: 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_10px_rgba(251,146,60,0.65)]',
    stepOuter: 'bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 p-[2px] shadow-md shadow-orange-400/40',
    glow: 'shadow-orange-500/35 hover:shadow-orange-500/50',
  },
  {
    cardGradient: 'bg-gradient-to-br from-fuchsia-600 via-brand-orange to-cyan-500',
    iconGradient: 'bg-gradient-to-br from-fuchsia-600 to-cyan-600 text-white shadow-lg shadow-fuchsia-500/40',
    listBorder: 'border-l-fuchsia-400/85',
    bullet: 'bg-gradient-to-r from-fuchsia-500 to-cyan-400 shadow-[0_0_10px_rgba(217,70,239,0.55)]',
    stepOuter: 'bg-gradient-to-br from-fuchsia-500 via-orange-500 to-cyan-400 p-[2px] shadow-md shadow-fuchsia-500/35',
    glow: 'shadow-fuchsia-500/30 hover:shadow-cyan-500/35',
  },
  {
    cardGradient: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500',
    iconGradient: 'bg-gradient-to-br from-emerald-600 to-sky-600 text-white shadow-lg shadow-emerald-500/40',
    listBorder: 'border-l-emerald-400/90',
    bullet: 'bg-gradient-to-r from-emerald-500 to-sky-400 shadow-[0_0_10px_rgba(20,184,166,0.55)]',
    stepOuter: 'bg-gradient-to-br from-emerald-400 via-teal-400 to-sky-400 p-[2px] shadow-md shadow-teal-500/35',
    glow: 'shadow-emerald-500/30 hover:shadow-sky-500/40',
  },
] as const

function RulerBorder({ width, height }: { width: string; height: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothX = useSpring(mouseX, { stiffness: 200, damping: 25 })
  const smoothY = useSpring(mouseY, { stiffness: 200, damping: 25 })
  const [hover, setHover] = useState(false)
  const [pos, setPos] = useState({ xPct: 0, yPct: 0 })

  const topTicks = 20
  const sideTicks = 12

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      mouseX.set(e.clientX - rect.left)
      mouseY.set(e.clientY - rect.top)
      setPos({
        xPct: (e.clientX - rect.left) / rect.width,
        yPct: (e.clientY - rect.top) / rect.height,
      })
    },
    [mouseX, mouseY],
  )

  const widthNum = parseFloat(width) || 0
  const heightNum = parseFloat(height) || 0

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ pointerEvents: 'auto' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="absolute -top-6 left-0 right-0 h-6">
        <motion.div
          className="absolute inset-0 bg-white/90 backdrop-blur-sm border border-brand-dark/10 rounded-t-lg overflow-hidden"
          animate={{ opacity: hover ? 1 : 0.5 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative w-full h-full">
            {Array.from({ length: topTicks + 1 }).map((_, i) => {
              const isMajor = i % 5 === 0
              return (
                <div
                  key={`t${i}`}
                  className="absolute bottom-0"
                  style={{ left: `${(i / topTicks) * 100}%` }}
                >
                  <div className={`${isMajor ? 'w-[1.5px] h-4 bg-brand-dark/40' : 'w-[1px] h-2.5 bg-brand-dark/15'}`} />
                  {isMajor && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-brand-dark/40">
                      {Math.round((i / topTicks) * widthNum)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="absolute top-0 right-1 text-[7px] font-bold text-brand-orange/70">{width}</div>
        </motion.div>

        {hover && (
          <motion.div
            className="absolute bottom-0 w-[1.5px] h-full bg-brand-orange z-10"
            style={{ left: smoothX }}
          >
            <motion.div
              className="absolute -top-5 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
            >
              {(pos.xPct * widthNum).toFixed(1)}
            </motion.div>
          </motion.div>
        )}
      </div>

      <div className="absolute top-0 -left-6 bottom-0 w-6">
        <motion.div
          className="absolute inset-0 bg-white/90 backdrop-blur-sm border border-brand-dark/10 rounded-l-lg overflow-hidden"
          animate={{ opacity: hover ? 1 : 0.5 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative w-full h-full">
            {Array.from({ length: sideTicks + 1 }).map((_, i) => {
              const isMajor = i % 3 === 0
              return (
                <div
                  key={`l${i}`}
                  className="absolute right-0"
                  style={{ top: `${(i / sideTicks) * 100}%` }}
                >
                  <div className={`${isMajor ? 'h-[1.5px] w-4 bg-brand-dark/40' : 'h-[1px] w-2.5 bg-brand-dark/15'}`} />
                  {isMajor && (
                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-brand-dark/40 -rotate-90 whitespace-nowrap">
                      {Math.round((i / sideTicks) * heightNum)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="absolute bottom-1 left-0 text-[7px] font-bold text-brand-orange/70 -rotate-90 origin-bottom-left translate-x-3">
            {height}
          </div>
        </motion.div>

        {hover && (
          <motion.div
            className="absolute right-0 h-[1.5px] w-full bg-brand-orange z-10"
            style={{ top: smoothY }}
          >
            <motion.div
              className="absolute -left-7 top-1/2 -translate-y-1/2 bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
            >
              {(pos.yPct * heightNum).toFixed(1)}
            </motion.div>
          </motion.div>
        )}
      </div>

      {hover && (
        <>
          <motion.div
            className="absolute top-0 bottom-0 w-[1px] bg-brand-orange/20 pointer-events-none"
            style={{ left: smoothX }}
          />
          <motion.div
            className="absolute left-0 right-0 h-[1px] bg-brand-orange/20 pointer-events-none"
            style={{ top: smoothY }}
          />
        </>
      )}
    </div>
  )
}

export default function ServicesPreviewClient({ data }: { data: ServicesSectionData }) {
  const openQuote = useUIStore((s) => s.openQuote)

  const handleOrder = (service: ServiceItem) => {
    trackEvent('service_order_click', { source: 'services_section', title: service.title })
    openQuote({
      id: 0,
      name: service.title,
      slug: 'home-services',
    })
  }

  return (
    <section className="section-padding bg-white">
      <div className="container">
        <div className="mb-14 text-center">
          <motion.h2
            initial={{ opacity: 1, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl font-black text-brand-dark sm:text-4xl md:text-6xl"
          >
            {data.headline.split(' ').map((word, i, arr) => {
              const isLast = i === arr.length - 1
              return (
                <span key={i}>
                  {isLast ? (
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange">
                      {word}
                    </span>
                  ) : (
                    <>{word} </>
                  )}
                </span>
              )
            })}
          </motion.h2>
          {data.subheadline && (
            <motion.p
              initial={{ opacity: 1, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="mt-4 text-base text-gray-500 sm:text-lg"
            >
              {data.subheadline}
            </motion.p>
          )}
        </div>

        <div className="space-y-14">
          {data.items.map((s, i) => {
            const Icon = resolveIcon(s.icon)
            const reversed = i % 2 !== 0
            return (
              <AnimatedSection key={`${s.title}-${i}`} delay={i * 0.1} direction={reversed ? 'right' : 'left'}>
                <div className="relative md:pl-8 md:pt-8">
                  <div className="hidden md:block">
                    <RulerBorder width={s.width} height={s.height} />
                  </div>
                  <div
                    className={`group flex flex-col ${reversed ? 'md:flex-row-reverse' : 'md:flex-row'} rounded-2xl border border-gray-100 bg-white transition-all duration-400 hover:shadow-xl md:rounded-3xl`}
                  >
                    <div className="relative h-56 min-h-[220px] overflow-hidden md:h-auto md:min-h-[300px] md:w-1/2">
                      {s.image && (
                        <Image
                          src={asset(s.image)}
                          alt={s.title}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          // sizes — критичен для Firefox, чтобы он не ломал srcset и
                          // загружал корректный источник (P1-5 QA-audit).
                          sizes="(max-width: 768px) 100vw, 50vw"
                          // Первые две карточки — above/near fold, грузим eager,
                          // остальные lazy. FF при lazy+IO+transform мог откладывать
                          // загрузку бесконечно, поэтому первые две — гарантированно.
                          loading={i < 2 ? 'eager' : 'lazy'}
                          fetchPriority={i === 0 ? 'high' : 'auto'}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <div className="absolute bottom-5 left-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 via-brand-orange to-amber-600 flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(255,102,0,0.55)] ring-1 ring-white/25 backdrop-blur-sm">
                        <Icon className="w-8 h-8 text-white" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center p-6 sm:p-8 md:w-1/2 md:p-12">
                      <h3 className="mb-3 text-xl font-black text-brand-dark sm:mb-4 sm:text-2xl md:text-3xl">
                        {s.title}
                      </h3>
                      <p className="mb-5 text-base leading-relaxed text-gray-500 sm:mb-6 md:text-lg">
                        {s.description}
                      </p>
                      <div className="mb-6">
                        <span className="inline-flex items-center gap-2 bg-brand-orange/10 text-brand-orange px-4 py-2 rounded-full text-sm font-semibold shadow-[0_0_12px_rgba(255,107,0,0.3)]">
                          <span className="w-2 h-2 bg-brand-orange rounded-full animate-pulse" />
                          {s.badge}
                        </span>
                      </div>
                      <div>
                        <Button
                          onClick={() => handleOrder(s)}
                          size="md"
                          className="rounded-full px-7 shadow-md shadow-brand-orange/30"
                        >
                          {s.cta_text || 'Заказать'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            )
          })}
        </div>

        {/* Также мы занимаемся — мини-блок внутри секции «Услуги» */}
        {data.also_we_do_items.length > 0 && (
          <div className="mt-20 border-t border-gray-200 pt-16">
            <motion.div
              initial={{ opacity: 1, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.55 }}
              className="mb-10 text-center md:mb-12"
            >
              <span className="mb-6 inline-flex rounded-full bg-gradient-to-r from-brand-orange via-amber-400 to-fuchsia-500 p-[2px] shadow-lg shadow-brand-orange/30">
                <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-white to-orange-50/90 px-5 py-2 text-sm font-bold text-brand-orange backdrop-blur-sm">
                  <Briefcase className="h-4 w-4" />
                  Спектр услуг
                </span>
              </span>
              <h2 className="mt-4 mb-4 text-3xl font-black text-brand-dark sm:text-4xl md:text-5xl">
                {(() => {
                  // Последнее слово фразы выделяем градиентом.
                  // Текст приходит из CMS как полная фраза («Также мы занимаемся»),
                  // поэтому не добавляем статический суффикс — иначе дубль.
                  const raw = (data.also_we_do_text || 'Также мы занимаемся').trim()
                  const words = raw.split(/\s+/)
                  if (words.length <= 1) {
                    return (
                      <span className="bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange bg-clip-text text-transparent">
                        {raw}
                      </span>
                    )
                  }
                  const lead = words.slice(0, -1).join(' ')
                  const accent = words[words.length - 1]
                  return (
                    <>
                      {lead}{' '}
                      <span className="bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange bg-clip-text text-transparent">
                        {accent}
                      </span>
                    </>
                  )
                })()}
              </h2>
              {data.also_we_do_subtitle && (
                <p className="mx-auto max-w-lg text-base text-gray-600 sm:text-lg">
                  {data.also_we_do_subtitle}
                </p>
              )}
            </motion.div>

            <div className="relative mx-auto max-w-2xl">
              <div
                className="pointer-events-none absolute bottom-10 left-[19px] top-5 w-[3px] rounded-full bg-gradient-to-b from-orange-400 via-brand-orange to-violet-500 opacity-80 shadow-[0_0_12px_rgba(255,107,0,0.35)] md:left-[22px]"
                aria-hidden
              />
              <ol className="relative list-none space-y-0 p-0">
                {data.also_we_do_items.map((block, i) => {
                  const Icon = resolveIcon(block.icon)
                  const isLast = i === data.also_we_do_items.length - 1
                  const palette = ALSO_GRADIENTS[i % ALSO_GRADIENTS.length]
                  return (
                    <li
                      key={`${block.title}-${i}`}
                      className={`relative flex gap-5 md:gap-7 ${isLast ? 'pb-0' : 'pb-12 md:pb-14'}`}
                    >
                      <div className="relative z-10 flex w-10 shrink-0 justify-center md:w-11">
                        <motion.div
                          initial={{ opacity: 1, scale: 0.6 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true, margin: '-60px' }}
                          transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 18 }}
                          className={`rounded-full ${palette.stepOuter}`}
                        >
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-black text-brand-dark ring-2 ring-white/90 md:h-10 md:w-10 md:text-base">
                            {i + 1}
                          </span>
                        </motion.div>
                      </div>
                      <motion.div
                        initial={{ opacity: 1, y: 28 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-50px' }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
                        whileHover={{
                          y: -6,
                          scale: 1.01,
                          transition: { type: 'spring', stiffness: 380, damping: 22 },
                        }}
                        className={`group min-w-0 flex-1 rounded-2xl ${palette.cardGradient} p-[2px] shadow-lg ${palette.glow} transition-shadow duration-300`}
                      >
                        <div className="rounded-[15px] bg-white/98 p-5 backdrop-blur-sm md:rounded-2xl md:p-7">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                            <span className={`mx-auto flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${palette.iconGradient} ring-1 ring-white/30 sm:mx-0`}>
                              <Icon className="h-7 w-7" strokeWidth={1.75} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className="mb-3 text-center text-lg font-bold leading-snug text-brand-dark sm:text-left md:text-xl">
                                {block.title}
                              </h3>
                              <ul className={`space-y-2.5 border-l-2 pl-4 sm:pl-5 ${palette.listBorder}`}>
                                {block.bullets.map((line, j) => (
                                  <motion.li
                                    key={`${line}-${j}`}
                                    initial={{ opacity: 1, x: -8 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, margin: '-30px' }}
                                    transition={{ duration: 0.35, delay: 0.05 + j * 0.06 }}
                                    className="flex gap-3 text-sm leading-relaxed text-gray-600 md:text-[15px]"
                                  >
                                    <span
                                      className={`mt-2 h-2 w-2 shrink-0 rounded-full ${palette.bullet}`}
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
        )}
      </div>
    </section>
  )
}
