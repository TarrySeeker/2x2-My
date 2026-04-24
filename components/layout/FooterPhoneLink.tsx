'use client'

import { trackEvent } from '@/lib/analytics'
import type { ReactNode } from 'react'

export default function FooterPhoneLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  return (
    <a
      href={href}
      onClick={() => trackEvent('phone_click', { source: 'footer' })}
      className="text-gray-300 hover:text-brand-orange transition-colors"
    >
      {children}
    </a>
  )
}
