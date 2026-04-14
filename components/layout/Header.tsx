'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { asset } from '@/lib/asset'

const navLinks = [
  { href: '/', label: 'Главная' },
  { href: '/about', label: 'О нас' },
  { href: '/services', label: 'Услуги' },
  { href: '/portfolio', label: 'Портфолио' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contacts', label: 'Контакты' },
]

export default function Header() {
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
      className={`fixed top-0 left-0 right-0 z-50 bg-white pt-[env(safe-area-inset-top,0px)] transition-shadow ${scrolled ? 'shadow-md' : 'shadow-sm'}`}
    >
      <div className="container flex h-16 min-w-0 items-center justify-between gap-3 md:h-20 md:gap-6">
        <Link
          href="/"
          className="flex min-w-0 flex-1 items-center justify-start py-1 pr-2 md:flex-none md:max-w-[min(100%,440px)] md:pr-4"
        >
          <Image
            src={asset("/img/logo.svg")}
            alt="2×2 — рекламное агентство"
            className="h-9 w-auto max-h-10 object-contain object-left sm:h-10 md:max-h-11 lg:max-h-12"
            width={498}
            height={71}
            priority
          />
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
          <a href="tel:+79044807740" className="btn-primary text-sm py-2 px-4">
            Позвонить
          </a>
        </nav>

        <button
          className="md:hidden p-2"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Меню"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
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
              href="tel:+79044807740"
              onClick={() => setIsOpen(false)}
              className="btn-primary text-sm py-3 text-center mt-2"
            >
              Позвонить
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
