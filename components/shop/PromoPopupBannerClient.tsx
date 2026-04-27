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

export interface PromoPopupStrings {
  /** Дефолтный текст CTA, если у акции не задан link_text */
  ctaDefault: string
  /** Aria-label кнопки закрытия баннера */
  closeAriaLabel: string
}

const DEFAULT_STRINGS: PromoPopupStrings = {
  ctaDefault: 'Подробнее',
  closeAriaLabel: 'Закрыть баннер акции',
}

const STORAGE_KEY = '2x2_promo_seen_v1'

/**
 * Промо-попап (центрированная модалка) — фикс 2026-04-26.
 *
 * Раньше это была inline-полоса между шапкой и Hero, но клиент попросил
 * настоящий центрированный попап с гарантированной видимостью контента
 * на любом экране (mobile 360×640 → 4K). Теперь:
 *  - fixed-оверлей по центру viewport, backdrop с blur
 *  - card max-h: calc(100dvh - 2rem) (1rem на mobile) + overflow-y:auto
 *  - safe-area-inset-{top,bottom,left,right} учитываются в padding
 *  - sm: max-w-md card / mobile: full-width минус 1rem
 *  - Esc + click outside + крестик — закрытие
 *  - sessionStorage — показ один раз за визит
 */
export default function PromoPopupBanner({
  strings = DEFAULT_STRINGS,
}: {
  strings?: PromoPopupStrings
} = {}) {
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
    const t = setTimeout(load, 800)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [])

  // Esc — закрытие. Подключаем только когда модалка реально на экране.
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

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
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-popup-title"
      // Контейнер-overlay: занимает весь viewport, центрирует карточку.
      // padding учитывает safe-area-inset на всех сторонах (iPhone notch /
      // gesture bar / landscape с notch). 100dvh вместо vh — корректно
      // ведёт себя при появлении/скрытии mobile-браузерной адресной строки.
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-3 py-4 backdrop-blur-sm sm:px-4 sm:py-6"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
      onClick={(e) => {
        // click outside (по бэкдропу, не по карточке) — закрываем
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div
        // Карточка: фиксированная max-h по dvh, внутри — overflow-y:auto.
        // На любом экране от 360×500 до 4K контент всегда виден или
        // скроллится. Никогда не вылезет за viewport.
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-brand-orange via-orange-500 to-amber-500 text-white shadow-2xl ring-1 ring-white/10"
        style={{
          // 100dvh минус суммарные safe-area paddings контейнера (≈2rem)
          // — гарантированно помещается. -2rem = sm-paddings; на ультра-
          // маленьком mobile реальный padding = max(1rem,…) ≈ 2*1rem = 2rem.
          maxHeight: 'calc(100dvh - 2rem)',
        }}
      >
        {/* Кнопка закрытия — поверх скролла, не уезжает */}
        <button
          type="button"
          onClick={dismiss}
          aria-label={strings.closeAriaLabel}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white/90 backdrop-blur-sm transition-colors hover:bg-white/25 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Скроллируемый контент */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-7 sm:px-7 sm:py-8">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <h2
            id="promo-popup-title"
            className="text-xl font-black leading-tight sm:text-2xl"
          >
            {promo.title}
          </h2>
          {promo.body && (
            <p className="mt-3 text-sm leading-relaxed text-white/95 sm:text-base">
              {promo.body}
            </p>
          )}
          {promo.link_url && (
            <Link
              href={promo.link_url}
              onClick={() => {
                // Сначала аналитика (синхронно), потом dismiss. Если бы
                // dismiss() шёл первым, на медленных устройствах модалка
                // могла размонтироваться раньше, чем trackEvent поставит
                // запрос в очередь. См. fix(promo) клиент-репорт 7-багов
                // 2026-04-27.
                trackEvent('promo_popup_cta', { promoId: promo.id })
                dismiss()
              }}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-brand-orange shadow-md transition-all hover:bg-white/95 hover:shadow-lg sm:w-auto sm:text-base"
            >
              {promo.link_text || strings.ctaDefault}
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
