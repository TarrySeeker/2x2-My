'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

export interface TrustBarClient {
  name: string
  /** URL логотипа. Может быть пустым/undefined — тогда рендерим пилюлю с названием. */
  logo?: string
}

interface Props {
  /** Заголовок над лентой. Пустая строка — заголовок скрыт. */
  text: string
  /** Массив клиентов (name + optional logo). */
  clients: TrustBarClient[]
}

/**
 * Клиентский слой Trust-bar.
 *
 * Дизайн:
 *  - Тёплый светлый фон (surface-cream) на фоне общего белого layout главной —
 *    даёт визуальное разделение между Hero и Services без тёмной полосы.
 *  - Лёгкие оранжевые орбы по краям для связности с брендом.
 *  - Мелкий uppercase-заголовок слева (вторичный neutral), справа — логотипы/пилюли.
 *  - На mobile — заголовок сверху, клиенты ниже центрированы; overflow-x-auto,
 *    чтобы длинный список не распирал вёрстку.
 *  - Логотипы: серый grayscale по умолчанию, на hover — цвет. Классика trust-bar.
 *  - Пилюли (когда нет logo) — плоские, нейтральные, с лёгким border и hover-
 *    акцентом brand-orange.
 *
 * Анимации:
 *  - Framer Motion whileInView с initial.opacity:1 fallback — критично для Firefox
 *    и mobile-Chrome, где IntersectionObserver иногда молчит и контент исчезал бы.
 *    y:6 → 0 даёт лёгкий fade-up без «прыжка».
 */
export default function TrustBarClient({ text, clients }: Props) {
  return (
    <section
      aria-label="Клиенты"
      className="relative overflow-hidden border-y border-neutral-200/70 bg-surface-cream py-10 md:py-14"
    >
      {/* декоративные орбы — не перекрывают контент */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-brand-orange/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl"
      />

      <div className="container relative z-10">
        <div className="flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between md:gap-10">
          {text && (
            <motion.p
              initial={{ opacity: 1, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-xs shrink-0 text-center text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-neutral-500 md:text-left md:text-xs"
            >
              {text}
            </motion.p>
          )}

          <motion.ul
            initial={{ opacity: 1 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ staggerChildren: 0.06, delayChildren: 0.1 }}
            role="list"
            className="-mx-4 flex w-full flex-1 items-center gap-5 overflow-x-auto px-4 scrollbar-none md:mx-0 md:flex-wrap md:justify-end md:gap-x-8 md:gap-y-4 md:overflow-visible md:px-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {clients.map((client, idx) => (
              <TrustItem key={`${client.name}-${idx}`} client={client} index={idx} />
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  )
}

function TrustItem({ client, index }: { client: TrustBarClient; index: number }) {
  const hasLogo = Boolean(client.logo)

  return (
    <motion.li
      initial={{ opacity: 1, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay: 0.05 + index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="shrink-0"
    >
      {hasLogo ? (
        <div className="group relative flex h-10 items-center md:h-12">
          <Image
            src={client.logo!}
            alt={client.name}
            width={160}
            height={48}
            className="h-10 w-auto max-w-[160px] object-contain opacity-80 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0 md:h-12"
            sizes="160px"
          />
        </div>
      ) : (
        <span
          className="inline-flex h-10 items-center rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-orange/60 hover:text-brand-dark hover:shadow md:h-11 md:px-5 md:text-[0.95rem]"
          title={client.name}
        >
          {client.name}
        </span>
      )}
    </motion.li>
  )
}
