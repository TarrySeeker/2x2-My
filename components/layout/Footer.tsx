import Image from 'next/image'
import Link from 'next/link'
import { asset } from '@/lib/asset'
import { getSettingValue } from '@/lib/data/settings'
import FooterPhoneLink from './FooterPhoneLink'

interface ContactsValue {
  phone_primary?: string
  phone_secondary?: string
  email?: string
  address?: string
}

interface BusinessHoursValue {
  weekdays?: string
  weekend?: string
  weekdays_short?: string
  weekend_short?: string
}

interface SocialsValue {
  vk?: string
  telegram?: string
  dzen?: string
}

const DEFAULT_CONTACTS: ContactsValue = {
  phone_primary: '+7-932-424-77-40',
  phone_secondary: '+7-904-480-77-40',
  email: 'sj_alex86@mail.ru',
  address: 'г. Ханты-Мансийск, ул. Парковая 92 Б',
}

const DEFAULT_HOURS: BusinessHoursValue = {
  weekdays: '09:00–19:00',
  weekend: 'По телефону',
  weekdays_short: 'Пн–Пт',
  weekend_short: 'Сб–Вс',
}

const DEFAULT_SOCIALS: SocialsValue = { vk: '', telegram: '', dzen: '' }

function digitsOnly(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (!cleaned) return '+79324247740'
  return cleaned
}

export default async function Footer() {
  const year = new Date().getFullYear()
  const contacts = await getSettingValue<ContactsValue>('contacts', DEFAULT_CONTACTS)
  const hours = await getSettingValue<BusinessHoursValue>('business_hours', DEFAULT_HOURS)
  const socials = await getSettingValue<SocialsValue>('socials', DEFAULT_SOCIALS)

  const phoneDisplay = contacts.phone_primary || DEFAULT_CONTACTS.phone_primary!
  const phoneTel = digitsOnly(phoneDisplay)
  const email = contacts.email || DEFAULT_CONTACTS.email!
  const address = contacts.address || DEFAULT_CONTACTS.address!

  const socialEntries: Array<{ label: string; href: string }> = []
  if (socials.vk) socialEntries.push({ label: 'ВКонтакте', href: socials.vk })
  if (socials.telegram) socialEntries.push({ label: 'Telegram', href: socials.telegram })
  if (socials.dzen) socialEntries.push({ label: 'Дзен', href: socials.dzen })

  return (
    <footer className="bg-brand-dark text-white">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex max-w-full rounded-lg bg-white p-3 shadow-sm ring-1 ring-white/10"
            >
              <Image
                src={asset('/img/logo.svg')}
                alt="2×2 — рекламное агентство"
                className="h-9 w-auto max-h-10 max-w-[min(100%,260px)] object-contain object-left sm:h-10"
                width={498}
                height={71}
              />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Рекламное агентство полного цикла. Создаём рекламу, которую замечают.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Навигация
            </h3>
            <ul className="space-y-2">
              {(
                [
                  ['/', 'Главная'],
                  ['/about', 'О нас'],
                  ['/services', 'Услуги'],
                  ['/portfolio', 'Портфолио'],
                  ['/faq', 'FAQ'],
                  ['/contacts', 'Контакты'],
                ] as const
              ).map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-gray-300 hover:text-brand-orange transition-colors text-sm"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Услуги
            </h3>
            <ul className="space-y-2">
              {['Полиграфия', 'Наружная реклама', 'Оформление фасадов'].map((s) => (
                <li key={s}>
                  <Link
                    href="/services"
                    className="text-gray-300 hover:text-brand-orange transition-colors text-sm"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
              Контакты
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <FooterPhoneLink href={`tel:${phoneTel}`}>{phoneDisplay}</FooterPhoneLink>
              </li>
              <li>
                <a
                  href={`mailto:${email}`}
                  className="text-gray-300 hover:text-brand-orange transition-colors break-all"
                >
                  {email}
                </a>
              </li>
              {socialEntries.length > 0 &&
                socialEntries.map((s) => (
                  <li key={s.href}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-brand-orange transition-colors"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              <li className="text-gray-400">{address}</li>
              <li className="text-gray-400">
                {hours.weekdays_short || 'Пн–Пт'}: {hours.weekdays || '09:00–19:00'}
                <br />
                {hours.weekend_short || 'Сб–Вс'}: {hours.weekend || 'По телефону'}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container flex flex-col items-center justify-between gap-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:flex-row">
          <p className="text-gray-500 text-sm">
            © {year} 2×2 Рекламное агентство. Все права защищены.
          </p>
          <p className="text-gray-600 text-xs">
            ИНН: 861006205140 · ОГРН: 323861700071382
          </p>
        </div>
      </div>
    </footer>
  )
}
