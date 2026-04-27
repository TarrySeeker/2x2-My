'use client'

import { ArrowRight } from 'lucide-react'

import Button from '@/components/ui/Button'
import { useUIStore } from '@/store/ui'
import { trackEvent } from '@/lib/analytics'

/**
 * CTA «Заказать» под карточкой услуги на /services.
 *
 * Открывает глобальный QuoteModal через `useUIStore.openQuote(...)` —
 * единое поведение с главной (см. `ServicesPreviewClient.tsx`,
 * `handleOrder`). Раньше тут был просто `<Button href={service.href ??
 * '/contacts'}>` — клик по нему уводил в /contacts либо вовсе не работал
 * (если `href` был `quote_modal`-маркером, но без обработчика). Клиент
 * жаловался: «кнопка „Заказать“ ничего не делает».
 *
 * Server-component'ы (как `ServicesCards.tsx`) не могут держать локальный
 * state для модалки, поэтому открытие модалки делегировано Zustand-стору,
 * а сам компонент остался серверным (важно для SEO ~6 услуг с описаниями).
 */
export default function ServicesCardCTA({
  serviceTitle,
  serviceSlug,
  ctaLabel = 'Заказать',
}: {
  serviceTitle: string
  /** Slug используется в аналитике + как `slug` для useUIStore.openQuote(). */
  serviceSlug: string
  ctaLabel?: string
}) {
  const openQuote = useUIStore((s) => s.openQuote)

  function handleClick() {
    trackEvent('service_order_click', {
      source: 'services_page',
      title: serviceTitle,
      slug: serviceSlug,
    })
    openQuote({
      // 0 — внешний source (не product из БД), модалка по нему ничего не
      // считает, использует только name для предзаполнения описания.
      id: 0,
      name: serviceTitle,
      slug: serviceSlug,
    })
  }

  return (
    <Button onClick={handleClick}>
      {ctaLabel} <ArrowRight className="h-4 w-4" />
    </Button>
  )
}
