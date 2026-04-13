'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView, useMotionValue, useTransform, animate } from 'framer-motion'
import { Gift, Ruler, Sparkles, RectangleHorizontal, Image } from 'lucide-react'
import Button from '@/components/ui/Button'

/** Первая буква строки — заглавная (остальное без изменений). */
function capitalizeFirst(s: string) {
  const t = s.trim()
  if (!t) return s
  return t.charAt(0).toLocaleUpperCase('ru-RU') + t.slice(1)
}

const promoHoverSpecs = Array.from({ length: 6 }, (_, i) => ({
  txPct: 20 + ((i * 37) % 80),
  tyPct: 15 + ((i * 53) % 75),
  dur: 1.15 + (i % 4) * 0.22,
  delay: i * 0.15,
}))

const promos = [
  {
    icon: Gift,
    text: 'При заказе 500 визиток/листовок',
    highlight: '500 шт. в подарок',
    color: 'from-orange-500 to-amber-400',
  },
  {
    icon: Ruler,
    text: 'При заказе вывески',
    highlight: 'замеры бесплатно',
    color: 'from-brand-orange to-red-500',
  },
  {
    icon: RectangleHorizontal,
    text: 'При заказе баннера',
    highlight: 'верёвка в подарок',
    color: 'from-rose-500 to-orange-500',
  },
  {
    icon: Image,
    text: 'Фото привязка вывески на фасад',
    highlight: 'Бесплатно!',
    color: 'from-cyan-600 to-emerald-500',
  },
]

function AnimatedTitle() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <div ref={ref} className="mb-12 flex flex-wrap items-center justify-center gap-3 sm:mb-16 sm:gap-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="text-3xl md:text-5xl font-black text-white"
      >
        Акции
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0, rotate: -180 }}
        animate={isInView ? { opacity: 1, scale: 1, rotate: 0 } : {}}
        transition={{ duration: 0.6, delay: 0.3, type: 'spring', stiffness: 200 }}
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 5, -5, 0], scale: [1, 1.2, 1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-brand-orange to-amber-400 rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,107,0,0.5)]"
        >
          <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" />
        </motion.div>
      </motion.div>
    </div>
  )
}

function PromoHoverParticles() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {promoHoverSpecs.map((s, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-brand-orange/60 rounded-full"
          initial={{
            x: '50%',
            y: '50%',
            opacity: 0,
          }}
          animate={{
            x: `${s.txPct}%`,
            y: `${s.tyPct}%`,
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: s.dur,
            repeat: Infinity,
            delay: s.delay,
          }}
        />
      ))}
    </motion.div>
  )
}

function PromoCard({ promo, index, isInView }: { promo: typeof promos[number]; index: number; isInView: boolean }) {
  const [hovered, setHovered] = useState(false)
  const Icon = promo.icon
  const progress = useMotionValue(0)
  const width = useTransform(progress, [0, 1], ['0%', '100%'])

  useEffect(() => {
    if (isInView) {
      animate(progress, 1, { duration: 1.2, delay: 0.5 + index * 0.2, ease: 'easeOut' })
    }
  }, [isInView, progress, index])

  return (
    <motion.div
      initial={{ opacity: 0, x: index % 2 === 0 ? -80 : 80, rotateY: index % 2 === 0 ? -15 : 15 }}
      animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.15, type: 'spring', stiffness: 100 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative"
    >
      <motion.div
        animate={hovered ? { scale: 1.02 } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10
          rounded-2xl p-6 md:p-8 cursor-default"
      >
        <motion.div
          className={`absolute inset-0 bg-gradient-to-r ${promo.color} opacity-0`}
          animate={hovered ? { opacity: 0.1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
        />

        <motion.div
          className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-brand-orange to-amber-400"
          style={{ width }}
        />

        <div className="relative flex items-center gap-5">
          <motion.div
            animate={hovered
              ? { scale: 1.15, rotate: 10, boxShadow: '0 0 30px rgba(255,107,0,0.5)' }
              : { scale: 1, rotate: 0, boxShadow: '0 0 0px rgba(255,107,0,0)' }
            }
            transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
            className={`w-16 h-16 shrink-0 bg-gradient-to-br ${promo.color} rounded-2xl flex items-center justify-center`}
          >
            <Icon className="w-8 h-8 text-white" />
          </motion.div>

          <div className="flex-1">
            <p className="text-sm text-white/70 md:text-base">{capitalizeFirst(promo.text)} —</p>
            <motion.p
              animate={hovered ? { scale: 1.03, x: 5 } : { scale: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-1 text-xl font-black text-brand-orange md:text-2xl"
            >
              {capitalizeFirst(promo.highlight)}
            </motion.p>
          </div>

          <motion.div
            animate={hovered
              ? { scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }
              : { scale: 1, opacity: 0.5 }
            }
            transition={hovered ? { duration: 1, repeat: Infinity } : { duration: 0.3 }}
            className="hidden md:block w-3 h-3 bg-brand-orange rounded-full shrink-0"
          />
        </div>

        {hovered && <PromoHoverParticles />}
      </motion.div>
    </motion.div>
  )
}

function makeArrowSpecs() {
  return Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: ((i * 47) % 140) - 70,
    delay: ((i * 19) % 200) / 100,
    duration: 1.2 + ((i * 31) % 150) / 100,
    side: (i % 2 === 0 ? 'left' : 'right') as 'left' | 'right',
  }))
}

function FloatingArrows() {
  const [arrows] = useState(makeArrowSpecs)

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {arrows.map((a) => {
        const startX = a.side === 'left' ? -100 + a.x : 100 + a.x
        return (
          <motion.div
            key={a.id}
            className="absolute bottom-0 left-1/2"
            initial={{ x: startX, y: 80, opacity: 0, scale: 0.3 }}
            animate={{
              x: [startX, startX * 0.2, 0],
              y: [80, -10, -70],
              opacity: [0, 0.8, 0],
              scale: [0.3, 0.9, 0.2],
            }}
            transition={{
              duration: a.duration,
              delay: a.delay,
              repeat: Infinity,
              ease: 'easeIn',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 20 20" fill="none" className="text-brand-orange">
              <path d="M10 16V4M10 4L5 9M10 4L15 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
        )
      })}
    </div>
  )
}

export default function PromotionsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="section-padding bg-brand-dark relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,107,0,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,107,0,0.06),transparent_50%)]" />

      <div className="container relative z-10">
        <AnimatedTitle />

        <div className="max-w-3xl mx-auto space-y-5 mb-16">
          {promos.map((p, i) => (
            <PromoCard key={i} promo={p} index={i} isInView={isInView} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="relative flex justify-center"
        >
          <div className="relative">
            <FloatingArrows />
            <motion.div
              animate={{ boxShadow: ['0 0 30px rgba(255,107,0,0.3)', '0 0 60px rgba(255,107,0,0.5)', '0 0 30px rgba(255,107,0,0.3)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="rounded-xl"
            >
              <Button href="/contacts" size="lg" className="relative z-10 text-lg px-14 py-5">
                Сделать заказ
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
