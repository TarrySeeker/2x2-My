'use client'

import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Sparkles, Gift } from 'lucide-react'
import Button from '@/components/ui/Button'

export interface PromoView {
  id: number
  title: string
  body: string
  link_url: string | null
  link_text: string | null
}

export interface PromotionsSectionData {
  headline: string
  subheadline: string
  cta_text: string
  cta_url: string
}

const PROMO_GRADIENTS = [
  'from-orange-500 to-amber-400',
  'from-brand-orange to-red-500',
  'from-rose-500 to-orange-500',
  'from-cyan-600 to-emerald-500',
  'from-amber-500 to-yellow-400',
] as const

const promoHoverSpecs = Array.from({ length: 6 }, (_, i) => ({
  txPct: 20 + ((i * 37) % 80),
  tyPct: 15 + ((i * 53) % 75),
  dur: 1.15 + (i % 4) * 0.22,
  delay: i * 0.15,
}))

function AnimatedTitle({ headline }: { headline: string }) {
  return (
    <div className="mb-12 flex flex-wrap items-center justify-center gap-3 sm:mb-16 sm:gap-4">
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.5 }}
        className="text-3xl md:text-5xl font-black text-white text-center"
      >
        {headline}
      </motion.div>
      <motion.div
        initial={{ opacity: 1, scale: 0, rotate: -180 }}
        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
        viewport={{ once: true, margin: '-50px' }}
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
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
    >
      {promoHoverSpecs.map((s, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-brand-orange/60 rounded-full"
          initial={{ x: '50%', y: '50%', opacity: 0 }}
          animate={{
            x: `${s.txPct}%`,
            y: `${s.tyPct}%`,
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
          }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
        />
      ))}
    </motion.div>
  )
}

function PromoCard({ promo, index }: { promo: PromoView; index: number }) {
  const [hovered, setHovered] = useState(false)
  const [seenInView, setSeenInView] = useState(false)
  const Icon = Gift
  const gradient = PROMO_GRADIENTS[index % PROMO_GRADIENTS.length]
  const progress = useMotionValue(0)
  const width = useTransform(progress, [0, 1], ['0%', '100%'])

  useEffect(() => {
    if (seenInView) {
      animate(progress, 1, { duration: 1.2, delay: 0.5 + index * 0.2, ease: 'easeOut' })
    }
  }, [seenInView, progress, index])

  return (
    <motion.div
      // Fallback: opacity: 1 — чтобы карточка оставалась видимой даже
      // если IntersectionObserver не успеет сработать (регрессия QA P0-2).
      initial={{ opacity: 1, x: index % 2 === 0 ? -80 : 80, rotateY: index % 2 === 0 ? -15 : 15 }}
      whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
      viewport={{ once: true, margin: '-50px 0px 50px 0px' }}
      onViewportEnter={() => setSeenInView(true)}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.15, type: 'spring', stiffness: 100 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative"
    >
      <motion.div
        animate={hovered ? { scale: 1.02 } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8 cursor-default"
      >
        <motion.div
          className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-0`}
          animate={hovered ? { opacity: 0.1 } : { opacity: 0 }}
          transition={{ duration: 0.3 }}
        />

        <motion.div
          className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-brand-orange to-amber-400"
          style={{ width }}
        />

        <div className="relative flex items-start gap-5">
          <motion.div
            animate={hovered
              ? { scale: 1.15, rotate: 10, boxShadow: '0 0 30px rgba(255,107,0,0.5)' }
              : { scale: 1, rotate: 0, boxShadow: '0 0 0px rgba(255,107,0,0)' }
            }
            transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
            className={`w-16 h-16 shrink-0 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center`}
          >
            <Icon className="w-8 h-8 text-white" />
          </motion.div>

          <div className="flex-1">
            <p className="mt-1 text-xl font-black text-brand-orange md:text-2xl">{promo.title}</p>
            {promo.body && <p className="mt-2 text-sm text-white/75 md:text-base">{promo.body}</p>}
            {promo.link_url && (
              <Button
                href={promo.link_url}
                variant="outline"
                size="sm"
                className="mt-4 border-white/30 bg-transparent text-white hover:bg-white hover:text-brand-dark"
              >
                {promo.link_text || 'Подробнее'}
              </Button>
            )}
          </div>
        </div>

        {hovered && <PromoHoverParticles />}
      </motion.div>
    </motion.div>
  )
}

export default function PromotionsSectionClient({
  section,
  promotions,
}: {
  section: PromotionsSectionData
  promotions: PromoView[]
}) {
  const ctaUrl = section.cta_url || '/contacts'

  if (promotions.length === 0) {
    // Без акций — секцию не рендерим (по решению клиента: акции редактируются
    // через админку, если их нет — нечего показывать).
    return null
  }

  return (
    <section className="section-padding bg-brand-dark relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,107,0,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,107,0,0.06),transparent_50%)]" />

      <div className="container relative z-10">
        <AnimatedTitle headline={section.headline || 'Акции'} />
        {section.subheadline && (
          <p className="mx-auto mb-12 max-w-2xl text-center text-base text-white/70 sm:text-lg">
            {section.subheadline}
          </p>
        )}

        <div className="max-w-3xl mx-auto space-y-5 mb-16">
          {promotions.map((p, i) => (
            <PromoCard key={p.id} promo={p} index={i} />
          ))}
        </div>

        {section.cta_text && (
          <motion.div
            initial={{ opacity: 1, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="relative flex justify-center"
          >
            <div className="relative">
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 30px rgba(255,107,0,0.3)',
                    '0 0 60px rgba(255,107,0,0.5)',
                    '0 0 30px rgba(255,107,0,0.3)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="rounded-xl"
              >
                <Button href={ctaUrl} size="lg" className="relative z-10 text-lg px-14 py-5">
                  {section.cta_text}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  )
}

