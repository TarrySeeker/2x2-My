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
 * Дизайн (правка 2026-04-26):
 *  - Вместо разрозненных логотипов/пилюль — единый «галерейный» стиль:
 *    круглый аватар-плейсхолдер (брендовый SVG силуэт) для каждого
 *    клиента + подпись (название) снизу. Все аватары одинаковые до
 *    момента, пока клиент не загрузит реальные фото-портреты людей или
 *    логотипы через /admin/content/settings → Trust-bar.
 *  - Тёплый кремовый фон + орбы по краям как раньше.
 *  - На mobile — горизонтальный скролл (overflow-x-auto), на md+ —
 *    flex-wrap, центровка по горизонтали.
 *  - Если у клиента всё-таки задан logo (через админку) — показываем
 *    его в круглой рамке (object-cover), чтобы не рассыпать единый ритм.
 *
 * Анимации:
 *  - Framer Motion whileInView с initial.opacity:1 fallback — критично для Firefox
 *    и mobile-Chrome, где IntersectionObserver иногда молчит и контент исчезал бы.
 */
const PLACEHOLDER_AVATAR = '/team/placeholder.svg'

export default function TrustBarClient({ text, clients }: Props) {
  return (
    <section
      aria-label="Клиенты"
      className="relative overflow-hidden border-y border-neutral-200/70 bg-surface-cream py-12 md:py-16"
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
        {text && (
          <motion.p
            initial={{ opacity: 1, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mb-8 max-w-xl text-center text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-neutral-500 md:mb-10 md:text-xs"
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
          className="-mx-4 flex items-end gap-6 overflow-x-auto px-4 scrollbar-none sm:gap-8 md:mx-0 md:flex-wrap md:justify-center md:gap-x-10 md:gap-y-8 md:overflow-visible md:px-0"
          style={{ scrollbarWidth: 'none' }}
        >
          {clients.map((client, idx) => (
            <TrustItem key={`${client.name}-${idx}`} client={client} index={idx} />
          ))}
        </motion.ul>
      </div>
    </section>
  )
}

function TrustItem({ client, index }: { client: TrustBarClient; index: number }) {
  // Намеренно не используем client.logo — клиент попросил единый
  // плейсхолдер-аватар для всех клиентов, пока реальные фото-портреты
  // людей не будут загружены. Поле logo в БД сохранено и продолжит
  // редактироваться через /admin/content/settings → Trust-bar для
  // будущей замены — поменяй строку ниже на
  //   const src = client.logo && client.logo.length > 0 ? client.logo : PLACEHOLDER_AVATAR
  // когда клиент загрузит реальные фото.
  const src = PLACEHOLDER_AVATAR

  return (
    <motion.li
      initial={{ opacity: 1, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.4, delay: 0.05 + index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className="flex w-20 shrink-0 flex-col items-center gap-3 sm:w-24 md:w-28"
    >
      <span
        className="relative inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-2 ring-white transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg sm:h-20 sm:w-20 md:h-24 md:w-24"
        title={client.name}
      >
        <Image
          src={src}
          alt={client.name}
          fill
          // sizes — реальный максимум 96px (md), плюс retina ×2 = 192.
          // Давайте 128 как разумный компромисс — Image сама подберёт.
          sizes="(min-width: 768px) 96px, (min-width: 640px) 80px, 64px"
          className="object-cover"
        />
      </span>
      <span className="block max-w-full truncate text-center text-xs font-semibold text-neutral-700 sm:text-sm">
        {client.name}
      </span>
    </motion.li>
  )
}
