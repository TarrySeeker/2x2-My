'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Phone, MessageCircle, Send } from 'lucide-react'
import AnimatedSection from '@/components/ui/AnimatedSection'
import { trackEvent, EVENTS } from '@/lib/analytics'

function WavyText({ text }: { text: string }) {
  const words = text.split(' ')
  let charIndex = 0

  return (
    <span className="inline-flex flex-wrap justify-center gap-x-3">
      {words.map((word, wi) => (
        <span key={wi} className="inline-flex">
          {word.split('').map((char) => {
            const i = charIndex++
            return (
              <motion.span
                key={`${wi}-${i}`}
                className="inline-block"
                animate={{
                  y: [0, -6, 0, 4, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.12,
                  ease: 'easeInOut',
                }}
                style={{ cursor: 'default' }}
              >
                {char}
              </motion.span>
            )
          })}
        </span>
      ))}
    </span>
  )
}

type Props = {
  title?: string
  subtitle?: string
}

export default function CtaSection({
  title = 'Готовы обсудить ваш проект?',
  subtitle = 'Оставьте заявку — перезвоним в течение часа и предложим решение под ваш бюджет',
}: Props) {
  const [agreed, setAgreed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hovered, setHovered] = useState<'write' | 'phone' | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!agreed) return
    setSubmitted(true)
  }

  return (
    <section className="section-padding bg-brand-orange relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />
      <div className="container relative z-10">
        <AnimatedSection className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="mb-6 text-2xl font-black leading-tight text-white sm:text-3xl md:text-5xl">
            <WavyText text={title} />
          </h2>
          <p className="text-white/80 mb-10 text-base sm:text-lg">{subtitle}</p>
          <div className="relative hidden flex-wrap items-center justify-center gap-4 md:flex">
            <motion.div
              animate={{
                scale: hovered === 'write' ? 1.12 : hovered === 'phone' ? 0.9 : 1,
                opacity: hovered === 'phone' ? 0 : 1,
                x: hovered === 'write' ? 'calc(50% + 8px)' : 0,
              }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              onMouseEnter={() => setHovered('write')}
              onMouseLeave={() => setHovered(null)}
            >
              <a
                href="/contacts"
                className="flex items-center gap-2 rounded-lg border-2 border-white/40 px-6 py-3 text-base font-semibold text-white transition-colors duration-300 hover:border-white hover:bg-white/10 sm:px-8 sm:py-4 sm:text-lg"
              >
                <MessageCircle className="w-5 h-5" />
                Написать нам
              </a>
            </motion.div>
            <motion.a
              href="tel:+79044807740"
              className="flex items-center gap-2 rounded-lg border-2 border-white/40 px-6 py-3 text-base font-semibold text-white transition-colors duration-300 hover:border-white hover:bg-white/10 sm:px-8 sm:py-4 sm:text-lg"
              animate={{
                scale: hovered === 'phone' ? 1.12 : hovered === 'write' ? 0.9 : 1,
                opacity: hovered === 'write' ? 0 : 1,
                x: hovered === 'phone' ? 'calc(-50% - 8px)' : 0,
              }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              onClick={() => trackEvent(EVENTS.phone_click, { source: 'cta_section' })}
              onMouseEnter={() => setHovered('phone')}
              onMouseLeave={() => setHovered(null)}
            >
              <Phone className="w-5 h-5" />
              +7-904-480-77-40
            </motion.a>
          </div>
          <div className="flex w-full max-w-md flex-col gap-3 sm:mx-auto md:hidden">
            <a
              href="/contacts"
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-white/40 px-6 py-3.5 text-center text-base font-semibold text-white transition-colors active:bg-white/10"
            >
              <MessageCircle className="h-5 w-5 shrink-0" />
              Написать нам
            </a>
            <a
              href="tel:+79044807740"
              onClick={() => trackEvent(EVENTS.phone_click, { source: 'cta_section' })}
              className="flex items-center justify-center gap-2 rounded-lg border-2 border-white/40 px-6 py-3.5 text-center text-base font-semibold text-white transition-colors active:bg-white/10"
            >
              <Phone className="h-5 w-5 shrink-0" />
              +7-904-480-77-40
            </a>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-white/70 text-sm">
            <span>✓ Бесплатная консультация</span>
            <span>✓ Замер и расчёт бесплатно</span>
            <span>✓ Срочно — от 24 часов</span>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.2} className="max-w-2xl mx-auto">
          <div className="relative bg-gradient-to-br from-brand-dark via-gray-900 to-brand-dark rounded-3xl p-8 md:p-10 shadow-2xl border border-white/10 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-brand-orange/15 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="relative z-10">
            <h3 className="text-2xl font-bold text-white text-center mb-2">
              Заполните форму обратной связи
            </h3>
            <p className="text-white/50 text-center mb-8">и мы обсудим Ваш заказ</p>

            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-400/30">
                  <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-white mb-2">Спасибо за заявку!</p>
                <p className="text-white/60">Мы свяжемся с вами в ближайшее время.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <input
                    type="text"
                    placeholder="Ваше имя"
                    required
                    className="w-full px-5 py-4 rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm
                      text-white placeholder:text-white/35
                      focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30 focus:bg-white/10
                      transition-all duration-300"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Ваш email"
                    required
                    className="w-full px-5 py-4 rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm
                      text-white placeholder:text-white/35
                      focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30 focus:bg-white/10
                      transition-all duration-300"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Ваш телефон"
                    required
                    className="w-full px-5 py-4 rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm
                      text-white placeholder:text-white/35
                      focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30 focus:bg-white/10
                      transition-all duration-300"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="Ваш комментарий"
                    rows={4}
                    className="w-full px-5 py-4 rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm
                      text-white placeholder:text-white/35 resize-none
                      focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30 focus:bg-white/10
                      transition-all duration-300"
                  />
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 w-5 h-5 shrink-0 rounded border-white/30 text-brand-orange
                      focus:ring-brand-orange/30 accent-[#FF6B00] cursor-pointer"
                  />
                  <span className="text-sm text-white/50 leading-relaxed">
                    Нажимая на кнопку, вы даёте согласие на обработку своих персональных данных
                    и соглашаетесь с{' '}
                    <a href="/privacy" className="text-brand-orange underline hover:no-underline">
                      политикой конфиденциальности
                    </a>.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={!agreed}
                  className="w-full flex items-center justify-center gap-2
                    bg-gradient-to-r from-brand-orange to-amber-500 text-white
                    font-bold text-lg px-8 py-4 rounded-xl
                    hover:shadow-xl hover:shadow-brand-orange/40 hover:scale-[1.02]
                    disabled:opacity-40 disabled:cursor-not-allowed
                    transition-all duration-300 cursor-pointer"
                >
                  <Send className="w-5 h-5" />
                  Отправить заявку
                </button>
              </form>
            )}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
