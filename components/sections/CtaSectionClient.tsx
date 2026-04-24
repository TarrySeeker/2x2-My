'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, MessageCircle, ArrowRight } from 'lucide-react'
import AnimatedSection from '@/components/ui/AnimatedSection'
import { trackEvent, EVENTS } from '@/lib/analytics'
import { useUIStore } from '@/store/ui'

export interface CtaSectionData {
  headline: string
  subheadline: string
  button_text: string
  button_url: string
  phone_text: string
  phone_number: string
  phone_display: string
}

export default function CtaSectionClient({ data }: { data: CtaSectionData }) {
  const [hovered, setHovered] = useState<'write' | 'phone' | null>(null)
  const openQuote = useUIStore((s) => s.openQuote)

  const buttonAsModal =
    !data.button_url ||
    data.button_url === 'quote_modal' ||
    data.button_url === '#quote'

  const handleButton = () => {
    trackEvent('cta_click', { source: 'cta_section', target: buttonAsModal ? 'quote_modal' : data.button_url })
    if (buttonAsModal) {
      openQuote({ id: 0, name: 'Заявка с CTA-секции', slug: 'home-cta' })
    }
  }

  const ButtonNode = (label: string) =>
    buttonAsModal ? (
      <button
        type="button"
        onClick={handleButton}
        className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-brand-orange shadow-lg shadow-black/10 transition-all hover:shadow-xl hover:scale-[1.02] sm:px-8 sm:py-4 sm:text-lg"
      >
        <MessageCircle className="w-5 h-5" />
        {label}
        <ArrowRight className="w-4 h-4" />
      </button>
    ) : (
      <a
        href={data.button_url}
        onClick={handleButton}
        className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-brand-orange shadow-lg shadow-black/10 transition-all hover:shadow-xl hover:scale-[1.02] sm:px-8 sm:py-4 sm:text-lg"
      >
        <MessageCircle className="w-5 h-5" />
        {label}
        <ArrowRight className="w-4 h-4" />
      </a>
    )

  return (
    <section className="section-padding bg-brand-orange relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

      <div className="container relative z-10">
        <AnimatedSection className="text-center max-w-3xl mx-auto">
          <h2 className="mb-6 text-2xl font-black leading-tight text-white sm:text-3xl md:text-5xl">
            {data.headline}
          </h2>
          {data.subheadline && (
            <p className="text-white/85 mb-10 text-base sm:text-lg md:text-xl">{data.subheadline}</p>
          )}

          <div className="relative hidden flex-wrap items-center justify-center gap-4 md:flex">
            <motion.div
              animate={{
                scale: hovered === 'write' ? 1.08 : hovered === 'phone' ? 0.95 : 1,
                opacity: hovered === 'phone' ? 0.5 : 1,
              }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              onMouseEnter={() => setHovered('write')}
              onMouseLeave={() => setHovered(null)}
            >
              {ButtonNode(data.button_text || 'Получить расчёт')}
            </motion.div>

            <motion.a
              href={`tel:${data.phone_number}`}
              className="flex items-center gap-2 rounded-lg border-2 border-white/40 px-6 py-3 text-base font-semibold text-white transition-colors duration-300 hover:border-white hover:bg-white/10 sm:px-8 sm:py-4 sm:text-lg"
              animate={{
                scale: hovered === 'phone' ? 1.08 : hovered === 'write' ? 0.95 : 1,
                opacity: hovered === 'write' ? 0.5 : 1,
              }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              onClick={() => trackEvent(EVENTS.phone_click, { source: 'cta_section' })}
              onMouseEnter={() => setHovered('phone')}
              onMouseLeave={() => setHovered(null)}
            >
              <Phone className="w-5 h-5" />
              {data.phone_display}
            </motion.a>
          </div>

          <div className="flex w-full max-w-md flex-col gap-3 sm:mx-auto md:hidden">
            {ButtonNode(data.button_text || 'Получить расчёт')}
            <a
              href={`tel:${data.phone_number}`}
              onClick={() => trackEvent(EVENTS.phone_click, { source: 'cta_section' })}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-white/40 px-6 py-3.5 text-center text-base font-semibold text-white transition-colors active:bg-white/10"
            >
              <Phone className="h-5 w-5 shrink-0" />
              {data.phone_display}
            </a>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-6 text-white/80 text-sm">
            <span>✓ Бесплатная консультация</span>
            <span>✓ Замер и фотомонтаж — бесплатно</span>
            <span>✓ Расчёт за час</span>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
