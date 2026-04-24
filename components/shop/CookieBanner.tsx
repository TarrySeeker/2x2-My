'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Cookie } from 'lucide-react'
import { cookieBanner } from '@/content/cookie-banner'
import { trackEvent } from '@/lib/analytics'

const VALUES = ['accepted', 'declined'] as const
type ConsentValue = (typeof VALUES)[number]

/**
 * Cookie-banner внизу страницы. Показывается до тех пор, пока
 * пользователь не нажал «Принять» или «Отклонить» (запоминается в
 * localStorage).
 *
 * Тексты — `content/cookie-banner.ts`. Storage-ключ оттуда же.
 *
 * Закрытие крестиком трактуется как «Отклонить» (то же поведение,
 * что и явная кнопка «Отклонить»).
 */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(cookieBanner.storageKey) as ConsentValue | null
      if (!saved || !VALUES.includes(saved)) {
        // Маленький defer, чтобы не мерцать при загрузке.
        const t = setTimeout(() => setVisible(true), 800)
        return () => clearTimeout(t)
      }
    } catch {
      // localStorage может быть недоступен (private mode) — показываем.
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  function persist(value: ConsentValue) {
    try {
      localStorage.setItem(cookieBanner.storageKey, value)
    } catch {
      /* private mode */
    }
    setVisible(false)
    // Сообщаем AnalyticsScripts/lib/analytics о смене consent в этой же
    // вкладке (storage-event сюда не приходит). Без этого события
    // Я.Метрика и GA4 подгрузятся только после полного reload.
    try {
      window.dispatchEvent(new Event('cookie-consent-changed'))
    } catch {
      /* старые браузеры */
    }
    trackEvent('cookie_consent', { consent: value })
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-label={cookieBanner.title}
          className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-4 sm:pb-4"
        >
          {/* Mobile (до md): блочная карточка — крупный заголовок, тело, кнопки.
              Desktop (md+): компакт — одна строка с минимальным padding,
              чтобы не перекрывать hero-CTA (QA P1-8). */}
          <div className="mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-4 shadow-2xl ring-1 ring-black/5 md:max-w-4xl md:items-center md:gap-3 md:rounded-xl md:px-3.5 md:py-2">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange md:h-7 md:w-7"
            >
              <Cookie className="h-5 w-5 md:h-3.5 md:w-3.5" />
            </span>
            <div className="min-w-0 flex-1 md:flex md:items-center md:gap-2.5">
              {/* Заголовок — только на mobile (на desktop избыточен в compact-режиме) */}
              <p className="text-sm font-semibold text-brand-dark md:hidden">
                {cookieBanner.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-600 md:mt-0 md:flex-1 md:text-[12px] md:leading-tight">
                <span className="hidden md:inline font-semibold text-brand-dark">
                  Cookies.{' '}
                </span>
                {cookieBanner.body}{' '}
                <Link
                  href={cookieBanner.policyUrl}
                  className="font-semibold text-brand-orange hover:underline"
                >
                  {cookieBanner.policyText}
                </Link>
                .
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0 md:shrink-0 md:flex-nowrap md:gap-1.5">
                <button
                  type="button"
                  onClick={() => persist('accepted')}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-600 md:rounded-md md:px-2.5 md:py-1 md:text-[11px]"
                >
                  {cookieBanner.acceptLabel}
                </button>
                <button
                  type="button"
                  onClick={() => persist('declined')}
                  className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-brand-dark transition-colors hover:bg-neutral-100 md:rounded-md md:px-2.5 md:py-1 md:text-[11px]"
                >
                  {cookieBanner.declineLabel}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => persist('declined')}
              aria-label={cookieBanner.closeAriaLabel}
              className="ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-brand-dark md:h-6 md:w-6"
            >
              <X className="h-4 w-4 md:h-3 md:w-3" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
