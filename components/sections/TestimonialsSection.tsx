'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { Star, Quote, ChevronLeft, ChevronRight, User, Briefcase, Coffee, MessageCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const testimonials: {
  id: number
  name: string
  company: string
  text: string
  rating: number
  icon: LucideIcon
  color: string
  bg: string
}[] = [
  {
    id: 1,
    name: 'Алексей Морозов',
    company: 'Директор, ООО "Техпром"',
    text: 'Заказывали полиграфию для выставки: каталоги, листовки, баннеры. Всё сделали за 3 дня без потери качества. Будем обращаться снова!',
    rating: 5,
    icon: Briefcase,
    color: 'text-blue-500',
    bg: 'from-blue-500/20 to-indigo-500/20',
  },
  {
    id: 2,
    name: 'Марина Соколова',
    company: 'Владелец, кофейня "Утро"',
    text: 'Заказала оформление витрины и световой короб. Результат превзошёл ожидания — теперь нас замечают с дороги. Профессионалы!',
    rating: 5,
    icon: Coffee,
    color: 'text-amber-500',
    bg: 'from-amber-500/20 to-orange-500/20',
  },
  {
    id: 3,
    name: 'Игорь Петров',
    company: 'Управляющий, ТЦ "Галактика"',
    text: 'Сотрудничаем с 2×2 уже 4 года. За это время сделали вывески для 20+ арендаторов. Всегда чёткие сроки и адекватные цены.',
    rating: 5,
    icon: User,
    color: 'text-emerald-500',
    bg: 'from-emerald-500/20 to-teal-500/20',
  },
]

function AnimatedAvatar({ icon: Icon, color, bg, delay }: { icon: LucideIcon; color: string; bg: string; delay: number }) {
  return (
    <motion.div
      className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center ring-2 ring-brand-orange/30 cursor-pointer`}
      initial={{ opacity: 0, scale: 0.5, rotate: -30 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ delay, duration: 0.5, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.2, rotate: 10 }}
    >
      <motion.div
        animate={{ y: [0, -3, 0, 2, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Icon className={`w-7 h-7 ${color}`} />
      </motion.div>
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-brand-orange/0"
        animate={{ scale: [1, 1.4, 1.4], opacity: [0.5, 0, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: delay + 0.5 }}
      />
    </motion.div>
  )
}

function AnimatedStars({ rating, delay }: { rating: number; delay: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: rating }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ delay: delay + i * 0.1, duration: 0.4, type: 'spring', stiffness: 300 }}
        >
          <Star className="w-5 h-5 text-brand-orange fill-brand-orange" />
        </motion.div>
      ))}
    </div>
  )
}

export default function TestimonialsSection() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  const next = useCallback(() => {
    setDirection(1)
    setCurrent((prev) => (prev + 1) % testimonials.length)
  }, [])

  const prev = useCallback(() => {
    setDirection(-1)
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }, [])

  useEffect(() => {
    if (isPaused) return
    const timer = setInterval(next, 6000)
    return () => clearInterval(timer)
  }, [next, isPaused])

  const item = testimonials[current]

  return (
    <section
      ref={sectionRef}
      className="section-padding bg-white relative overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-brand-orange/5 blur-[100px] -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-brand-orange/5 blur-[80px] translate-y-1/2" />

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
            <MessageCircle className="h-4 w-4" />
            Отзывы
          </motion.div>
          <h2 className="mb-4 text-3xl font-black text-brand-dark sm:text-4xl md:text-6xl">
            Что говорят{' '}
            <span className="bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange bg-clip-text text-transparent">
              клиенты
            </span>
          </h2>
          <p className="mx-auto max-w-lg text-base text-gray-600 sm:text-lg">
            Нам доверяют более 300 компаний и предпринимателей
          </p>
        </motion.div>

        <div className="relative mx-auto max-w-3xl">
          <button
            type="button"
            onClick={prev}
            className="absolute left-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 shadow-lg transition-all duration-300 hover:border-brand-orange hover:text-brand-orange hover:shadow-brand-orange/20 sm:left-1 sm:h-11 sm:w-11 md:-left-14 lg:-left-16"
            aria-label="Предыдущий отзыв"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-0 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 shadow-lg transition-all duration-300 hover:border-brand-orange hover:text-brand-orange hover:shadow-brand-orange/20 sm:right-1 sm:h-11 sm:w-11 md:-right-14 lg:-right-16"
            aria-label="Следующий отзыв"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="overflow-hidden px-11 sm:px-12 md:px-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={item.id}
                initial={{ x: direction > 0 ? 200 : -200, opacity: 0, scale: 0.95 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                exit={{ x: direction > 0 ? -200 : 200, opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative rounded-2xl bg-brand-gray p-5 sm:rounded-3xl sm:p-8 md:p-12">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 0.15, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="absolute top-6 right-8"
                  >
                    <Quote className="w-20 h-20 text-brand-orange" />
                  </motion.div>

                  <div className="relative">
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, duration: 0.4 }}
                      className="mb-6 text-base italic leading-relaxed text-gray-700 sm:mb-8 sm:text-lg md:text-xl"
                    >
                      &laquo;{item.text}&raquo;
                    </motion.p>

                    <AnimatedStars rating={item.rating} delay={0.3} />

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4, duration: 0.4 }}
                      className="flex items-center gap-4 mt-6"
                    >
                      <AnimatedAvatar icon={item.icon} color={item.color} bg={item.bg} delay={0.45} />
                      <div>
                        <div className="font-bold text-brand-dark text-lg">{item.name}</div>
                        <div className="text-gray-500 text-sm">{item.company}</div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="flex justify-center items-center gap-3 mt-8">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i) }}
              className="relative cursor-pointer h-2 rounded-full overflow-hidden transition-all duration-300"
              style={{ width: i === current ? 48 : 8 }}
            >
              <div className={`absolute inset-0 rounded-full ${i === current ? 'bg-brand-orange/30' : 'bg-gray-300'}`} />
              {i === current && (
                <motion.div
                  className="absolute inset-y-0 left-0 bg-brand-orange rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: isPaused ? 99999 : 6, ease: 'linear' }}
                  key={`progress-${current}`}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
