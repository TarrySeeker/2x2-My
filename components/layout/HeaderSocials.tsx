'use client'

import { useEffect, useRef, useState } from 'react'
import { Share2, X } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'

interface SocialLinks {
  vk?: string
  telegram?: string
  dzen?: string
}

interface HeaderSocialsProps {
  socials: SocialLinks
}

const VK_ICON = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M12.785 16.241s.288-.032.435-.193c.135-.148.131-.426.131-.426s-.018-1.296.581-1.49c.59-.19 1.347 1.262 2.149 1.821.607.422 1.067.33 1.067.33l2.146-.031s1.122-.071.59-.964c-.044-.073-.31-.658-1.594-1.864-1.346-1.265-1.166-1.06.456-3.246.987-1.331 1.382-2.143 1.259-2.49-.117-.331-.847-.244-.847-.244l-2.428.015s-.18-.025-.314.056c-.131.08-.215.265-.215.265s-.385 1.029-.898 1.904c-1.082 1.847-1.516 1.945-1.693 1.83-.413-.267-.31-1.073-.31-1.647 0-1.795.272-2.543-.527-2.737-.265-.064-.46-.107-1.137-.114-.87-.009-1.605.003-2.022.207-.276.135-.49.437-.36.454.16.022.522.099.713.36.247.337.238 1.094.238 1.094s.142 2.077-.331 2.336c-.325.177-.77-.184-1.736-1.86-.495-.86-.869-1.808-.869-1.808s-.072-.176-.201-.27c-.156-.114-.375-.15-.375-.15l-2.308.015s-.347.01-.474.16c-.114.135-.009.413-.009.413s1.808 4.226 3.854 6.357c1.876 1.953 4.005 1.825 4.005 1.825z" />
  </svg>
)

const TG_ICON = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M9.04 15.32 8.86 18.4c.27 0 .39-.12.53-.27l1.27-1.22 2.65 1.95c.49.27.83.13.96-.46l1.74-8.13c.16-.74-.27-1.03-.74-.85L4.62 12.93c-.72.28-.7.69-.13.87l2.52.79 5.86-3.7c.28-.18.53-.08.32.1z" />
  </svg>
)

const DZEN_ICON = (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
    <path d="M12 2c0 5.523-4.477 10-10 10 5.523 0 10 4.477 10 10 0-5.523 4.477-10 10-10-5.523 0-10-4.477-10-10z" />
  </svg>
)

interface SocialEntry {
  key: 'vk' | 'telegram' | 'dzen'
  label: string
  url: string
  icon: React.ReactNode
  brandClass: string
}

export default function HeaderSocials({ socials }: HeaderSocialsProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const entries: SocialEntry[] = []
  if (socials.vk)
    entries.push({
      key: 'vk',
      label: 'ВКонтакте',
      url: socials.vk,
      icon: VK_ICON,
      brandClass: 'text-[#0077FF] hover:bg-[#0077FF]/10',
    })
  if (socials.telegram)
    entries.push({
      key: 'telegram',
      label: 'Telegram',
      url: socials.telegram,
      icon: TG_ICON,
      brandClass: 'text-[#229ED9] hover:bg-[#229ED9]/10',
    })
  if (socials.dzen)
    entries.push({
      key: 'dzen',
      label: 'Дзен',
      url: socials.dzen,
      icon: DZEN_ICON,
      brandClass: 'text-brand-dark hover:bg-neutral-100',
    })

  // Если ни одна соцсеть не заполнена в админке — иконку не показываем,
  // чтобы не было пустого dropdown.
  if (entries.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          if (!open) trackEvent('header_socials_open', {})
        }}
        aria-label="Соцсети"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-brand-dark transition-colors hover:bg-orange-50 hover:text-brand-orange"
      >
        {open ? <X className="h-5 w-5" /> : <Share2 className="h-5 w-5" />}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Соцсети"
          className="absolute right-0 top-12 z-50 w-56 origin-top-right overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl"
        >
          {entries.map((e) => (
            <a
              key={e.key}
              href={e.url}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => trackEvent('header_socials_click', { network: e.key })}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${e.brandClass}`}
            >
              <span aria-hidden>{e.icon}</span>
              {e.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
