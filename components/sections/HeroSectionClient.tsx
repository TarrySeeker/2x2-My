'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useUIStore } from '@/store/ui'
import { trackEvent } from '@/lib/analytics'

const NOISE_BG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`

function useTypewriterLoop(text: string, speed = 80, pauseAfterType = 2000, pauseAfterErase = 500) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    if (!text) return
    let i = 0
    let isTyping = true
    let timeout: ReturnType<typeof setTimeout>

    function tick() {
      if (isTyping) {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) {
          isTyping = false
          timeout = setTimeout(tick, pauseAfterType)
          return
        }
      } else {
        i--
        setDisplayed(text.slice(0, i))
        if (i <= 0) {
          isTyping = true
          timeout = setTimeout(tick, pauseAfterErase)
          return
        }
      }
      timeout = setTimeout(tick, isTyping ? speed : speed / 2)
    }

    timeout = setTimeout(tick, 700)
    return () => clearTimeout(timeout)
  }, [text, speed, pauseAfterType, pauseAfterErase])

  return displayed
}

function AbstractCluster({ className }: { className?: string }) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <motion.div
        className="absolute -right-[6%] top-[2%] h-[82%] w-[78%] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] bg-gradient-to-br from-brand-orange/25 via-amber-400/20 to-rose-400/15 blur-3xl"
        animate={{ rotate: [0, 8, -4, 0], scale: [1, 1.06, 0.98, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -left-[10%] bottom-[6%] h-[62%] w-[78%] rounded-full bg-gradient-to-tr from-amber-300/30 to-brand-orange/20 blur-[72px]"
        animate={{ y: [0, -24, 0], x: [0, 16, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  )
}

export interface HeroSectionData {
  eyebrow: string
  headline_line1: string
  headline_accent: string
  headline_line3: string
  /**
   * Чередующийся массив заголовков. Если задан (длина ≥ 2) — Hero
   * показывает их по очереди вместо статичных headline_line1/accent/line3.
   * Правка клиента 2026-04-24.
   */
  titles: string[]
  typewriter: string
  subheadline: string
  cta_primary_text: string
  /** Если строка === 'quote_modal' — открываем QuoteModal вместо перехода. */
  cta_primary_url: string
  cta_secondary_text: string
  cta_secondary_url: string
}

export default function HeroSectionClient({ data }: { data: HeroSectionData }) {
  const sectionRef = useRef(null)
  const displayed = useTypewriterLoop(data.typewriter || '', 70, 3000)
  const openQuote = useUIStore((s) => s.openQuote)

  // Чередующиеся заголовки. Показываем только если их ≥ 2 —
  // иначе используем старую вёрстку с headline_line1/accent/line3.
  const rotatingTitles = (data.titles || []).filter((t) => t && t.trim().length > 0)
  const useRotation = rotatingTitles.length >= 2
  const [titleIndex, setTitleIndex] = useState(0)
  // Явный fade-state: управляем opacity руками вместо AnimatePresence,
  // чтобы в Safari/WebKit не было «наложения» двух стейтов (одного уходящего,
  // другого приходящего) — баг QA P0-1, 2026-04-24. Цикл:
  //   1. visible=true (fade in) → через HOLD_MS
  //   2. visible=false (fade out) → через FADE_MS меняем индекс
  //   3. visible=true снова.
  const [titleVisible, setTitleVisible] = useState(true)

  useEffect(() => {
    if (!useRotation) return
    const HOLD_MS = 2400
    const FADE_MS = 400
    let advanceTimer: number | undefined
    let fadeInTimer: number | undefined

    const scheduleNext = () => {
      advanceTimer = window.setTimeout(() => {
        // fade out
        setTitleVisible(false)
        fadeInTimer = window.setTimeout(() => {
          setTitleIndex((i) => (i + 1) % rotatingTitles.length)
          setTitleVisible(true)
          scheduleNext()
        }, FADE_MS)
      }, HOLD_MS)
    }
    scheduleNext()
    return () => {
      if (advanceTimer) window.clearTimeout(advanceTimer)
      if (fadeInTimer) window.clearTimeout(fadeInTimer)
    }
  }, [useRotation, rotatingTitles.length])
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  const blobY = useTransform(scrollYProgress, [0, 1], ['0%', '22%'])
  const artY = useTransform(scrollYProgress, [0, 1], ['0%', '14%'])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0])

  // CTA-primary: если URL — спец-маркер 'quote_modal' или пустой, открываем модалку.
  const primaryAsModal =
    !data.cta_primary_url ||
    data.cta_primary_url === 'quote_modal' ||
    data.cta_primary_url === '#quote'

  const handlePrimary = () => {
    trackEvent('cta_click', { source: 'hero', target: primaryAsModal ? 'quote_modal' : data.cta_primary_url })
    if (primaryAsModal) {
      // Не передаём «name» для заявки с hero — QuoteModal покажет нейтральное
      // описание «Опишите задачу — пришлём КП...» вместо префикса
      // «Заявка с главной». name: '' делает description null-case.
      openQuote({ id: 0, name: '', slug: 'home-hero' })
    }
  }

  const primaryButton = primaryAsModal ? (
    <Button
      onClick={handlePrimary}
      size="lg"
      className="rounded-full px-10 py-4 text-base shadow-xl shadow-brand-orange/25 sm:text-lg"
    >
      {data.cta_primary_text || 'Получить расчёт'}
      <ArrowRight className="h-5 w-5" />
    </Button>
  ) : (
    <Button
      href={data.cta_primary_url}
      size="lg"
      className="rounded-full px-10 py-4 text-base shadow-xl shadow-brand-orange/25 sm:text-lg"
      onClick={handlePrimary}
    >
      {data.cta_primary_text || 'Получить расчёт'}
      <ArrowRight className="h-5 w-5" />
    </Button>
  )

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100dvh] overflow-hidden bg-[#FFF9F5]"
    >
      {/* Фон: пятна + шум */}
      <motion.div style={{ y: blobY }} className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#FFF5EF] to-white" />
        <motion.div
          className="absolute -right-[20%] -top-[30%] h-[85vmin] w-[85vmin] rounded-full bg-gradient-to-bl from-brand-orange/20 via-amber-300/12 to-transparent blur-3xl"
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-[25%] -left-[15%] h-[70vmin] w-[70vmin] rounded-full bg-gradient-to-tr from-rose-300/15 via-brand-orange/10 to-amber-200/10 blur-3xl"
          animate={{ scale: [1, 1.06, 0.95, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute left-[40%] top-[20%] h-[40vmin] w-[40vmin] rounded-full bg-brand-orange/5 blur-2xl"
          animate={{ y: [0, 30, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          className="absolute inset-0 opacity-[0.07] mix-blend-multiply"
          style={{ backgroundImage: NOISE_BG }}
        />
      </motion.div>

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="container relative z-10 mx-auto max-w-7xl pb-24 pt-[max(7rem,calc(4.5rem+env(safe-area-inset-top,0px)))] sm:pb-28 sm:pt-28 md:pb-32 md:pt-32 lg:pt-36"
      >
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10 lg:gap-y-0">
          {/* Текстовая колонка */}
          <div className="text-center lg:col-span-7 lg:text-left lg:pr-4">
            {data.eyebrow && (
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mb-8 flex justify-center lg:justify-start"
              >
                <p className="max-w-xs text-center text-[11px] font-semibold uppercase leading-relaxed tracking-[0.22em] text-neutral-500 sm:max-w-none sm:text-left lg:text-left">
                  {data.eyebrow}
                </p>
              </motion.div>
            )}

            <motion.h1
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              className="text-balance font-black uppercase leading-[0.92] tracking-tight text-brand-dark [font-family:var(--font-display),system-ui,sans-serif]"
            >
              {useRotation ? (
                /*
                 * Чередование заголовков (P0-1, повтор 2026-04-24).
                 *
                 * Почему не AnimatePresence: в Safari/WebKit при смене key в
                 * AnimatePresence mode="wait" между exit старого и initial
                 * нового элемента иногда происходит двойной коммит DOM —
                 * и на экране оставались оба стейта одновременно (см. QA
                 * screenshots webkit/home-top.png 2026-04-24).
                 *
                 * Теперь — один неизменный <span>, текст меняется только когда
                 * opacity уже === 0. Управление state-машиной: setTimeout-цикл
                 * в useEffect (HOLD→fade-out→swap→fade-in). Никаких overlay,
                 * никаких absolute, никаких двух одновременных DOM-узлов.
                 * Transition через CSS (className) — чтобы исключить интерференцию
                 * с framer-motion transform/clip в Safari.
                 */
                <span
                  className="relative block text-[clamp(2rem,6.5vw,4.25rem)] text-brand-orange [min-height:calc(var(--rot-lines,3)*1em*0.95)]"
                  aria-live="polite"
                  style={
                    {
                      // 3 строки — безопасный максимум для длинных заголовков
                      // вида «Региональный оператор наружной рекламы ХМАО и ЯНАО»
                      // на mobile (где clamp работает в нижней границе).
                      ['--rot-lines' as string]: '3',
                    } as React.CSSProperties
                  }
                >
                  <span
                    className="block transition-opacity duration-[400ms] ease-out will-change-[opacity]"
                    style={{ opacity: titleVisible ? 1 : 0 }}
                  >
                    {rotatingTitles[titleIndex]}
                  </span>
                </span>
              ) : (
                <>
                  {data.headline_line1 && (
                    <span className="block text-[clamp(2.4rem,8.5vw,5.5rem)]">{data.headline_line1}</span>
                  )}
                  {data.headline_accent && (
                    <span className="mt-1 block text-[clamp(2.4rem,8.5vw,5.5rem)]">
                      <span className="bg-gradient-to-r from-brand-orange via-amber-500 to-[#FF8A4C] bg-clip-text text-transparent">
                        {data.headline_accent}
                      </span>
                    </span>
                  )}
                  {data.headline_line3 && (
                    <span className="mt-1 block text-[clamp(1.85rem,5.5vw,3.25rem)] text-neutral-800">
                      {data.headline_line3}
                    </span>
                  )}
                </>
              )}
            </motion.h1>

            {data.typewriter && (
              <div className="mx-auto mt-10 min-h-[2.75rem] max-w-2xl text-center lg:mx-0 lg:text-left">
                <p className="text-xl font-bold text-brand-orange sm:text-2xl md:text-3xl">
                  {displayed}
                  <motion.span
                    aria-hidden
                    className="ml-1 inline-block h-[1em] w-0.5 translate-y-0.5 bg-brand-orange align-middle"
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.55 }}
                  />
                </p>
              </div>
            )}

            {data.subheadline && (
              <motion.p
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto mt-10 max-w-xl text-pretty text-base leading-relaxed text-neutral-600 sm:text-lg md:text-xl lg:mx-0"
              >
                {data.subheadline}
              </motion.p>
            )}

            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:justify-center lg:justify-start"
            >
              {primaryButton}
              {data.cta_secondary_text && data.cta_secondary_url && (
                <Button
                  href={data.cta_secondary_url}
                  variant="outline"
                  size="lg"
                  className="rounded-full border-2 border-neutral-300 bg-white/80 px-10 py-4 text-base text-neutral-800 backdrop-blur-sm hover:border-brand-dark hover:bg-brand-dark hover:text-white sm:text-lg"
                >
                  {data.cta_secondary_text}
                </Button>
              )}
            </motion.div>
          </div>

          {/* Абстракция — только десктоп (правая колонка) */}
          <motion.div
            style={{ y: artY }}
            className="relative hidden min-h-[380px] lg:col-span-5 lg:block lg:min-h-[460px]"
          >
            <AbstractCluster className="h-full min-h-[380px] lg:min-h-[460px]" />
          </motion.div>
        </div>

        {/* Абстракция — мобильная полоса под сеткой */}
        <div className="relative mt-4 h-44 w-full lg:hidden">
          <AbstractCluster className="h-full" />
        </div>
      </motion.div>

      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 7, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
          className="flex h-9 w-6 items-start justify-center rounded-full border border-neutral-300/90 bg-white/80 pt-2 shadow-sm backdrop-blur-sm"
        >
          <div className="h-1.5 w-0.5 rounded-full bg-brand-orange/70" />
        </motion.div>
      </motion.div>
    </section>
  )
}
