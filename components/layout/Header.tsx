import { getSettingValue } from '@/lib/data/settings'
import HeaderClient from './HeaderClient'

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
}

const DEFAULT_CONTACTS: ContactsValue = {
  phone_primary: '+7-932-424-77-40',
  phone_secondary: '+7-904-480-77-40',
  email: 'sj_alex86@mail.ru',
  address: 'г. Ханты-Мансийск, ул. Парковая 92 Б',
}

const DEFAULT_SOCIALS: SocialsValue = {
  vk: '',
  telegram: '',
  dzen: '',
}

function digitsOnly(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (!cleaned) return '+79324247740'
  return cleaned
}

/**
 * Header — server-обёртка. Контакты и соцсети берутся из site_settings.
 * Корзина удалена (master-plan правка 9). Вместо неё — кнопка соцсетей
 * (master-plan правка 10).
 */
export default async function Header() {
  const contacts = await getSettingValue<ContactsValue>('contacts', DEFAULT_CONTACTS)
  const socials = await getSettingValue<SocialsValue>('socials', DEFAULT_SOCIALS)

  const phoneDisplay = contacts.phone_primary || DEFAULT_CONTACTS.phone_primary!
  const phoneTel = digitsOnly(phoneDisplay)

  return (
    <HeaderClient
      phoneDisplay={phoneDisplay}
      phoneTel={phoneTel}
      socials={{
        vk: socials.vk || '',
        telegram: socials.telegram || '',
        dzen: socials.dzen || '',
      }}
    />
  )
}
