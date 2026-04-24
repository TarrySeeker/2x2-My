'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import { UserRound } from 'lucide-react'
import type { TeamMember } from '@/types'
import { asset } from '@/lib/asset'

export default function TeamSectionClient({ team }: { team: TeamMember[] }) {
  return (
    <section className="section-padding bg-white">
      <div className="container min-w-0">
        <div className="mb-14 text-center">
          <motion.h2
            initial={{ opacity: 1, y: 16 }}
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
            initial={{ opacity: 1, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: 0.06 }}
            className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-500 sm:mt-5 sm:text-lg"
          >
            Специалисты, которые сделают рекламу правильно
          </motion.p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 min-w-0 sm:grid-cols-2 sm:gap-6 md:gap-8 lg:grid-cols-3">
          {team.map((m, i) => (
            <motion.article
              key={m.id}
              initial={{ opacity: 1, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-24px 0px -40px 0px' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: Math.min(i * 0.06, 0.36) }}
              whileHover={{ y: -4 }}
              className="min-w-0 overflow-hidden rounded-2xl border border-gray-100 bg-white text-center shadow-sm transition-shadow hover:shadow-xl"
            >
              <div className="relative mx-auto mt-6 aspect-square w-32 overflow-hidden rounded-full ring-4 ring-orange-100 transition-all duration-300 hover:ring-brand-orange md:w-36">
                {m.photo_url ? (
                  <Image
                    src={asset(m.photo_url)}
                    alt={m.name}
                    fill
                    sizes="160px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50/80">
                    <UserRound className="h-16 w-16 text-brand-orange" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div className="px-5 py-5 md:px-6">
                <h3 className="break-words text-lg font-bold text-brand-dark md:text-xl">{m.name}</h3>
                <p className="mt-1 break-words text-sm font-semibold text-brand-orange md:text-base">
                  {m.role}
                </p>
                {m.bio && (
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-gray-600 md:text-base">
                    {m.bio}
                  </p>
                )}
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}
