'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { trackEvent, EVENTS } from '@/lib/analytics'
import HeaderSocials from './HeaderSocials'

const navLinks = [
  { href: '/', label: 'Главная' },
  { href: '/about', label: 'О нас' },
  { href: '/services', label: 'Услуги' },
  { href: '/portfolio', label: 'Портфолио' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contacts', label: 'Контакты' },
] as const

export interface HeaderClientProps {
  phoneDisplay: string
  phoneTel: string
  socials: {
    vk?: string
    telegram?: string
    dzen?: string
  }
}

export default function HeaderClient({ phoneDisplay, phoneTel, socials }: HeaderClientProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 bg-white pt-[env(safe-area-inset-top,0px)] transition-shadow ${
        scrolled ? 'shadow-md' : 'shadow-sm'
      }`}
    >
      <div className="container flex h-16 min-w-0 items-center justify-between gap-3 md:h-20 md:gap-6">
        <Link
          href="/"
          aria-label="2×2 — рекламное агентство"
          className="flex min-w-0 flex-1 items-center justify-start gap-3 py-1 pr-2 md:flex-none md:max-w-[min(100%,440px)] md:pr-4"
        >
          {/* Квадратик-знак из логотипа */}
          <svg
            viewBox="0 0 70 70"
            className="h-9 w-9 shrink-0 sm:h-10 sm:w-10 md:h-11 md:w-11"
            aria-hidden="true"
          >
            <rect width="70" height="70" rx="6" fill="#FF6600" />
            <g fill="#FFFFFF" transform="translate(0, 1.15)">
              <path d="M25.47 48.06l-17.07 0 0 -3.25c4.92,-3.72 8.28,-6.48 10.05,-8.29 1.78,-1.8 2.67,-3.5 2.67,-5.11 0,-1.15 -0.42,-2.04 -1.25,-2.67 -0.84,-0.62 -1.84,-0.94 -3.02,-0.94 -2.59,0 -4.71,0.94 -6.36,2.83l-2.4 -2.72c1.01,-1.23 2.29,-2.16 3.83,-2.81 1.54,-0.65 3.16,-0.97 4.86,-0.97 2.4,0 4.43,0.65 6.08,1.94 1.65,1.3 2.47,3.07 2.47,5.34 0,2.03 -0.85,4.04 -2.54,6.04 -1.7,2 -4.29,4.32 -7.77,6.96l10.46 0 0 3.64z" />
              <polygon points="41.7,44.27 38.45,44.27 34.99,39.36 31.52,44.27 28.28,44.27 33.17,37.43 28.56,30.94 31.82,30.94 34.99,35.47 38.14,30.94 41.4,30.94 36.79,37.43" />
              <path d="M61.17 48.06l-17.07 0 0 -3.25c4.92,-3.72 8.28,-6.48 10.05,-8.29 1.78,-1.8 2.67,-3.5 2.67,-5.11 0,-1.15 -0.42,-2.04 -1.25,-2.67 -0.84,-0.62 -1.84,-0.94 -3.02,-0.94 -2.59,0 -4.71,0.94 -6.36,2.83l-2.4 -2.72c1.01,-1.23 2.29,-2.16 3.83,-2.81 1.54,-0.65 3.16,-0.97 4.86,-0.97 2.4,0 4.43,0.65 6.08,1.94 1.65,1.3 2.47,3.07 2.47,5.34 0,2.03 -0.85,4.04 -2.54,6.04 -1.7,2 -4.29,4.32 -7.77,6.96l10.46 0 0 3.64z" />
            </g>
          </svg>

          {/* «Рекламное / агентство» — основной текст */}
          <div className="hidden min-w-0 flex-col leading-[1.05] sm:flex">
            <span className="text-sm font-bold text-brand-dark md:text-[15px]">Рекламное</span>
            <span className="text-sm font-bold text-brand-dark md:text-[15px]">агентство</span>
          </div>

          {/* «Работы по / ХМАО и ЯНАО» — подпись справа, мельче */}
          <div className="hidden min-w-0 flex-col leading-[1.05] text-gray-600 md:flex">
            <span className="text-[11px] font-medium md:text-xs">Работы по</span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark md:text-xs">
              ХМАО и ЯНАО
            </span>
          </div>
        </Link>

        <nav className="hidden min-w-0 shrink-0 md:flex items-center gap-6">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors hover:text-brand-orange ${
                pathname === l.href
                  ? 'text-brand-orange border-b-2 border-brand-orange pb-0.5'
                  : 'text-brand-dark'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <HeaderSocials socials={socials} />
          <a
            href={`tel:${phoneTel}`}
            onClick={() => trackEvent(EVENTS.phone_click, { source: 'header' })}
            className="hidden md:inline-flex btn-primary text-sm py-2 px-4"
          >
            {phoneDisplay}
          </a>
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Меню"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-t shadow-lg">
          <nav className="container py-4 flex flex-col gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setIsOpen(false)}
                className={`py-3 px-4 rounded-lg text-sm font-medium ${
                  pathname === l.href
                    ? 'bg-orange-50 text-brand-orange'
                    : 'text-brand-dark hover:bg-gray-50'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <a
              href={`tel:${phoneTel}`}
              onClick={() => {
                trackEvent(EVENTS.phone_click, { source: 'header' })
                setIsOpen(false)
              }}
              className="btn-primary text-sm py-3 text-center mt-2"
            >
              Позвонить — {phoneDisplay}
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
