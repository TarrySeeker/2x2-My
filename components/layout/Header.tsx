import { getSettingValue } from '@/lib/data/settings'
import HeaderClient, { type HeaderNavLink } from './HeaderClient'

interface ContactsValue {
  phone_primary?: string
  phone_secondary?: string
  email?: string
  address?: string
}

interface SocialsValue {
  vk?: string
  telegram?: string
  dzen?: string
  max?: string
}

interface NavigationHeaderValue {
  items?: Array<{
    href?: string
    label?: string
    order?: number
    visible?: boolean
  }>
}

const DEFAULT_CONTACTS: ContactsValue = {
  phone_primary: '+7-932-424-77-40',
  phone_secondary: '+7-904-480-77-40',
  email: 'sj_alex86@mail.ru',
  address: 'г. Ханты-Мансийск, ул. Парковая, 92 Б',
}

const DEFAULT_SOCIALS: SocialsValue = {
  vk: '',
  telegram: '',
  dzen: '',
  max: '',
}

/**
 * Дефолтная навигация — используется, если `site_settings.navigation_header`
 * не заполнен. Структура совпадает со старым hardcoded-списком.
 */
const DEFAULT_NAV_LINKS: HeaderNavLink[] = [
  { href: '/', label: 'Главная' },
  { href: '/about', label: 'О нас' },
  { href: '/services', label: 'Услуги' },
  { href: '/portfolio', label: 'Портфолио' },
  { href: '/faq', label: 'FAQ' },
  { href: '/contacts', label: 'Контакты' },
]

function digitsOnly(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (!cleaned) return '+79324247740'
  return cleaned
}

/**
 * Header — server-обёртка. Контакты, соцсети и меню берутся из site_settings.
 * Корзина удалена (master-plan правка 9). Вместо неё — кнопка соцсетей.
 */
export default async function Header() {
  const contacts = await getSettingValue<ContactsValue>('contacts', DEFAULT_CONTACTS)
  const socials = await getSettingValue<SocialsValue>('socials', DEFAULT_SOCIALS)
  const navSetting = await getSettingValue<NavigationHeaderValue>(
    'navigation_header',
    { items: [] },
  )

  const phoneDisplay = contacts.phone_primary || DEFAULT_CONTACTS.phone_primary!
  const phoneTel = digitsOnly(phoneDisplay)

  const cmsItems = Array.isArray(navSetting.items) ? navSetting.items : []
  const navLinks: HeaderNavLink[] =
    cmsItems.length > 0
      ? cmsItems
          .filter(
            (i) =>
              i &&
              typeof i.href === 'string' &&
              i.href.length > 0 &&
              typeof i.label === 'string' &&
              i.label.length > 0 &&
              i.visible !== false,
          )
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((i) => ({ href: i.href!, label: i.label! }))
      : DEFAULT_NAV_LINKS

  return (
    <HeaderClient
      phoneDisplay={phoneDisplay}
      phoneTel={phoneTel}
      socials={{
        vk: socials.vk || '',
        telegram: socials.telegram || '',
        dzen: socials.dzen || '',
        max: socials.max || '',
      }}
      navLinks={navLinks}
    />
  )
}
