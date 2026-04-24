'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Sparkles } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'

interface PromoPopupData {
  id: number
  title: string
  body: string
  link_url: string | null
  link_text: string | null
}

const STORAGE_KEY = '2x2_promo_seen_v1'

/**
 * Промо-полоса между шапкой и Hero (master-plan правка 2026-04-24).
 *
 * Это НЕ модалка и НЕ fixed-оверлей. Полоса рендерится inline в потоке
 * документа — просто сдвигает контент ниже, ничего не перекрывая.
 * Показывается один раз за визит (sessionStorage). Закрывается крестиком.
 *
 * Источник данных: GET /api/promotions/active → берём первый popup.
 * Если попапов нет или пользователь уже закрыл — компонент не рендерит DOM
 * (возвращает null, чтобы не оставлять пустую высоту).
 */
export default function PromoPopupBanner() {
  const [promo, setPromo] = useState<PromoPopupData | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        // sessionStorage check — не показываем повторно за один визит.
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(STORAGE_KEY)) {
          return
        }
        const res = await fetch('/api/promotions/active', { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json()) as {
          popup?: PromoPopupData | null
          list?: PromoPopupData[]
        }
        const candidate =
          json.popup ?? (Array.isArray(json.list) ? json.list.find(Boolean) ?? null : null)
        if (!cancelled && candidate) {
          setPromo(candidate)
          setVisible(true)
          trackEvent('promo_popup_view', { promoId: candidate.id })
        }
      } catch {
        // Молча — на промо нельзя вешать критичную ошибку.
      }
    }

    // Лёгкий defer, чтобы не блокировать FCP.
    const t = setTimeout(load, 600)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(STORAGE_KEY, '1')
      } catch {
        /* sessionStorage может быть недоступен (private mode) */
      }
    }
    if (promo) trackEvent('promo_popup_dismiss', { promoId: promo.id })
  }

  if (!visible || !promo) return null

  return (
    <div
      role="region"
      aria-label="Акция"
      className="relative z-20 mt-[calc(4rem+env(safe-area-inset-top,0px))] w-full bg-gradient-to-r from-brand-orange via-orange-500 to-amber-500 text-white shadow-sm md:mt-[calc(5rem+env(safe-area-inset-top,0px))]"
    >
      <div className="container mx-auto flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6 sm:py-3">
        <span
          aria-hidden
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm sm:flex"
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="truncate text-sm font-bold leading-snug sm:text-base">
            {promo.title}
            {promo.body && (
              <span className="ml-2 hidden font-normal text-white/85 md:inline">
                — {promo.body}
              </span>
            )}
          </p>
        </div>
        {promo.link_url && (
          <Link
            href={promo.link_url}
            onClick={() => trackEvent('promo_popup_cta', { promoId: promo.id })}
            className="shrink-0 whitespace-nowrap rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur-sm transition-colors hover:bg-white/25 sm:px-4 sm:py-2 sm:text-sm"
          >
            {promo.link_text || 'Подробнее'}
            <span className="ml-1" aria-hidden>→</span>
          </Link>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Закрыть"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/85 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
