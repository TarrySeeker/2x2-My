'use client'

import { useRef, useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Users, Calendar, Briefcase, MapPin, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const stats = [
  { icon: Calendar, value: 12, suffix: '+', label: 'лет на рынке', color: 'from-orange-500 to-amber-400' },
  { icon: Briefcase, value: 500, suffix: '+', label: 'проектов', color: 'from-brand-orange to-red-500' },
  { icon: Users, value: 300, suffix: '+', label: 'клиентов', color: 'from-amber-500 to-orange-500' },
  { icon: MapPin, value: 1, suffix: '', label: 'город — Ханты-Мансийск', color: 'from-orange-600 to-amber-500' },
]

import { Factory, UserCheck, Zap, ShieldCheck } from 'lucide-react'

const highlights = [
  { text: 'Собственное производство', icon: Factory, gradient: 'from-orange-500 via-amber-400 to-yellow-400' },
  { text: 'Индивидуальный подход', icon: UserCheck, gradient: 'from-brand-orange via-red-400 to-pink-400' },
  { text: 'Быстрые сроки', icon: Zap, gradient: 'from-amber-500 via-orange-400 to-brand-orange' },
  { text: 'Гарантия качества', icon: ShieldCheck, gradient: 'from-emerald-400 via-teal-400 to-cyan-400' },
]

function AnimatedCounter({
  value,
  suffix,
  inView,
  className,
}: {
  value: number
  suffix: string
  inView: boolean
  className?: string
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = Math.max(1, Math.floor(value / 50))
    const interval = setInterval(() => {
      start += step
      if (start >= value) {
        setCount(value)
        clearInterval(interval)
      } else {
        setCount(start)
      }
    }, 25)
    return () => clearInterval(interval)
  }, [inView, value])

  return <span className={className ?? 'tabular-nums'}>{count}{suffix}</span>
}

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

function HighlightSlider({ inView }: { inView: boolean }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!inView) return
    const timer = setInterval(() => {
      setActive(prev => (prev + 1) % highlights.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [inView])

  const current = highlights[active]
  const Icon = current.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="mb-10"
    >
      <div className="relative flex min-h-[5.5rem] items-center justify-center px-2 sm:min-h-24 sm:px-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 200, damping: 20 }}
            className={`absolute inline-flex max-w-[min(100%,22rem)] items-center gap-3 rounded-2xl bg-gradient-to-r px-5 py-4 text-base font-bold text-white shadow-xl shadow-brand-orange/25 sm:max-w-none sm:gap-4 sm:px-8 sm:py-5 sm:text-lg md:text-xl lg:text-2xl ${current.gradient}`}
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Icon className="w-8 h-8" />
            </motion.div>
            {current.text}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-2 mt-4">
        {highlights.map((h, i) => (
          <button
            key={h.text}
            type="button"
            onClick={() => setActive(i)}
            className="relative h-2 rounded-full overflow-hidden transition-all duration-300 ring-1 ring-emerald-300/50"
            style={{ width: i === active ? 40 : 12 }}
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 opacity-25" />
            {i === active && (
              <motion.div
                className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 2.5, ease: 'linear' }}
                style={{ transformOrigin: 'left' }}
              />
            )}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

export default function AboutPreview() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section ref={ref} className="section-padding bg-white relative overflow-hidden">
      <FloatingOrb className="w-[400px] h-[400px] bg-brand-orange/5 top-0 left-0 -translate-x-1/2 -translate-y-1/2" delay={0} />
      <FloatingOrb className="w-[300px] h-[300px] bg-amber-500/5 bottom-0 right-0 translate-x-1/3 translate-y-1/3" delay={2} />
      <FloatingOrb className="w-[200px] h-[200px] bg-orange-500/5 top-1/2 right-1/4" delay={4} />

      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div>
            <motion.span
              initial={{ opacity: 0, y: -15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-brand-orange text-white px-5 py-2 rounded-full text-sm font-bold mb-8 shadow-lg shadow-brand-orange/30"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              О компании
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-6xl font-black text-brand-dark mb-8 leading-[1.05]"
            >
              Рекламное агентство{' '}
              <motion.span
                className="inline-block align-middle"
                animate={isInView ? { scale: [1, 1.06, 1] } : {}}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <Image
                  src="/img/log-2.png"
                  alt="2×2"
                  width={280}
                  height={90}
                  className="h-[0.92em] w-auto max-h-14 object-contain object-bottom sm:max-h-16 md:max-h-[4.5rem]"
                  sizes="(max-width: 768px) 200px, 280px"
                />
              </motion.span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-gray-600 text-xl md:text-2xl leading-relaxed mb-5"
            >
              Мы — команда профессионалов, которая помогает бизнесу заявить о себе. Полиграфия, наружная
              реклама, оформление фасадов — делаем всё, чтобы вас заметили.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="whitespace-pre-line text-gray-600 text-xl md:text-2xl leading-relaxed mb-10"
            >
              {`Быстрые сроки и индивидуальный подход к каждому клиенту — вот почему нам доверяют сотни компаний.

Отправляем полиграфию по РФ с бесплатной доставкой в любой город, в ХМАО и ЯНАО в частности.`}
            </motion.p>

            <HighlightSlider inView={isInView} />

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
              <Link href="/about" className="group relative inline-flex items-center gap-3 overflow-hidden">
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  className="inline-flex items-center gap-3 bg-brand-orange text-white px-9 py-4.5 rounded-xl
                    font-bold text-lg shadow-lg shadow-brand-orange/30 hover:shadow-xl hover:shadow-brand-orange/40 transition-all duration-300"
                >
                  Подробнее о нас
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
          </div>

        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-4 md:gap-x-0 md:gap-y-0 md:divide-x md:divide-gray-200/80"
        >
          {stats.map((stat, i) => {
            const Icon = stat.icon
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: 0.45 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="group flex flex-col items-center px-2 text-center md:px-6 lg:px-8"
              >
                <div
                  className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-6 md:h-11 md:w-11 ${stat.color}`}
                >
                  <Icon className="h-5 w-5 md:h-5 md:w-5" strokeWidth={2.25} />
                </div>
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  inView={isInView}
                  className={`mb-2 block bg-gradient-to-br bg-clip-text font-black tabular-nums text-4xl leading-none text-transparent transition-transform duration-300 ease-out group-hover:scale-[1.03] md:text-5xl lg:text-6xl ${stat.color}`}
                />
                <p className="max-w-[10.5rem] text-pretty text-sm font-semibold leading-snug text-neutral-600 transition-colors duration-300 group-hover:text-brand-dark md:max-w-none md:text-base">
                  {stat.label}
                </p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
