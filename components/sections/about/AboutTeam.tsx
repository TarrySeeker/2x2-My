'use client'

import { motion } from 'framer-motion'
import { UserRound } from 'lucide-react'

const team = [{ role: 'Директор' }, { role: 'Арт-директор' }, { role: 'Менеджер проектов' }] as const

export default function AboutTeam() {
  return (
    <section className="section-padding bg-white">
      <div className="container min-w-0">
        <div className="mb-14 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl font-black text-brand-dark sm:text-4xl md:text-6xl"
          >
            Наша{' '}
            <span className="bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange bg-clip-text text-transparent">
              команда
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
            className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500 sm:mt-5 sm:text-lg"
          >
            Специалисты, которые сделают рекламу правильно
          </motion.p>
        </div>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 min-w-0 sm:grid-cols-3 sm:gap-6 md:gap-8">
          {team.map((m, i) => (
            <motion.div
              key={m.role}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px 0px -40px 0px' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: Math.min(i * 0.06, 0.24) }}
              className="min-w-0 text-center"
            >
              <div className="mb-4 flex justify-center" aria-hidden>
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-50 to-amber-50/80 ring-4 ring-orange-100 transition-all duration-300 hover:ring-brand-orange">
                  <UserRound className="h-12 w-12 text-brand-orange" strokeWidth={1.5} />
                </div>
              </div>
              <p className="break-words text-base leading-relaxed text-gray-500 sm:text-lg">
                {m.role}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
