'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export type AccordionItem = { question: string; answer: string; emoji?: string }

export default function Accordion({ items }: { items: AccordionItem[] }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div
          key={i}
          className={`rounded-2xl border-2 overflow-hidden transition-colors duration-300
          ${open === i ? 'border-brand-orange bg-orange-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
        >
          <button
            type="button"
            className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            <span className="flex min-w-0 items-center gap-3">
              {item.emoji ? (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl" aria-hidden>
                  {item.emoji}
                </span>
              ) : null}
              <span
                className={`min-w-0 font-semibold text-base transition-colors ${open === i ? 'text-brand-orange' : 'text-brand-dark'}`}
              >
                {item.question}
              </span>
            </span>
            <motion.div
              animate={{ rotate: open === i ? 180 : 0 }}
              transition={{ duration: 0.3 }}
              className="shrink-0"
              aria-hidden
            >
              <ChevronDown
                className={`w-5 h-5 transition-colors ${open === i ? 'text-brand-orange' : 'text-gray-400'}`}
              />
            </motion.div>
          </button>
          <AnimatePresence>
            {open === i && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-6 pb-5 text-sm leading-relaxed text-gray-600 whitespace-pre-line">{item.answer}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}
