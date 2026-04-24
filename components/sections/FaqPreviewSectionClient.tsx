'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react'

export interface FaqItem {
  question: string
  answer: string
  emoji: string
}

export interface FaqSectionData {
  headline: string
  subheadline: string
  items: FaqItem[]
}

function FaqCard({
  item,
  index,
  isOpen,
  toggle,
}: {
  item: FaqItem
  index: number
  isOpen: boolean
  toggle: () => void
}) {
  return (
    <motion.div
      // Fallback на opacity: 1 — если IntersectionObserver не успевает
      // сработать (Firefox / mobile-Chrome при быстром скролле или когда
      // секция уже в viewport до монтажа), карточка всё равно видима.
      // Анимация остаётся только для трансформации (slide + rotate).
      // Регрессия QA 2026-04-24 P0-2.
      initial={{ opacity: 1, x: index % 2 === 0 ? -60 : 60, rotate: index % 2 === 0 ? -3 : 3 }}
      whileInView={{ opacity: 1, x: 0, rotate: 0 }}
      viewport={{ once: true, margin: '-50px 0px 50px 0px' }}
      transition={{ duration: 0.6, delay: index * 0.08, type: 'spring', stiffness: 100 }}
      className="relative"
    >
      <motion.div
        animate={!isOpen ? { y: [0, -6, 0, -3, 0] } : { y: 0 }}
        transition={{
          duration: 3 + index * 0.5,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.4,
        }}
      >
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative cursor-pointer overflow-hidden rounded-3xl backdrop-blur-sm transition-shadow duration-400
            ${isOpen
              ? 'shadow-[0_10px_50px_rgba(255,107,0,0.25)] ring-1 ring-brand-orange/30'
              : 'border border-white/10 bg-white/5 hover:border-white/15 hover:shadow-lg hover:shadow-black/20'
            }`}
          onClick={toggle}
        >
          <div
            className={`relative p-6 transition-colors duration-400 md:p-8
            ${isOpen
              ? 'bg-gradient-to-r from-brand-orange via-orange-500 to-amber-500'
              : 'bg-white/5'
            }`}
          >
            {isOpen && (
              <motion.div
                className="absolute inset-0 opacity-20"
                initial={{ backgroundPosition: '0% 0%' }}
                animate={{ backgroundPosition: ['0% 0%', '100% 100%'] }}
                transition={{ duration: 4, repeat: Infinity, repeatType: 'reverse' }}
                style={{
                  backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)',
                  backgroundSize: '200% 200%',
                }}
              />
            )}

            <div className="relative flex items-center gap-5">
              {item.emoji && (
                <motion.div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl
                    ${isOpen ? 'bg-white/20 backdrop-blur-sm' : 'bg-brand-orange/15'}`}
                  animate={!isOpen ? { rotate: [0, 5, -5, 0] } : { rotate: 0 }}
                  transition={{ duration: 4, repeat: Infinity, delay: index * 0.4 }}
                >
                  {item.emoji}
                </motion.div>
              )}

              <div className="flex-1 min-w-0">
                <span className="block text-lg font-bold text-white md:text-xl">{item.question}</span>
              </div>

              <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.35, type: 'spring', stiffness: 200 }}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                  ${isOpen ? 'bg-white/20' : 'bg-brand-orange/15'}`}
              >
                <ChevronDown className={`w-5 h-5 ${isOpen ? 'text-white' : 'text-brand-orange'}`} />
              </motion.div>
            </div>
          </div>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden border-t border-white/10 bg-brand-dark"
              >
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -10, opacity: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex gap-4 px-6 py-6 md:px-8"
                >
                  <MessageCircle className="mt-1 h-5 w-5 shrink-0 text-brand-orange" />
                  <p className="text-base leading-relaxed whitespace-pre-line text-gray-300 md:text-lg">
                    {item.answer}
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

export default function FaqPreviewSectionClient({ data }: { data: FaqSectionData }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  if (data.items.length === 0) return null

  return (
    <section className="section-padding relative overflow-hidden bg-brand-dark">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,107,0,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,107,0,0.06),transparent_50%)]" />

      <div className="container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-12 lg:gap-20 items-start">
          <motion.div
            // Fallback на opacity: 1 — см. комментарий в FaqCard.
            initial={{ opacity: 1, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
            className="lg:sticky lg:top-32"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center gap-2 bg-brand-orange/15 text-brand-orange px-5 py-2 rounded-full text-sm font-bold mb-6"
            >
              <HelpCircle className="w-4 h-4" />
              FAQ
            </motion.div>

            <h2 className="mb-6 text-4xl font-black leading-tight text-white md:text-6xl">
              {data.headline}
            </h2>
            {data.subheadline && (
              <p className="text-lg leading-relaxed text-gray-400">{data.subheadline}</p>
            )}

            <motion.div
              className="mt-8 hidden items-center gap-3 text-sm text-gray-500 lg:flex"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <ChevronDown className="w-4 h-4" />
              Нажмите на вопрос
            </motion.div>
          </motion.div>

          <div className="space-y-5">
            {data.items.map((item, i) => (
              <FaqCard
                key={`${item.question}-${i}`}
                item={item}
                index={i}
                isOpen={openIndex === i}
                toggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
