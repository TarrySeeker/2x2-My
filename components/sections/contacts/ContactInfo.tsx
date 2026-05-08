import { Phone, Mail, MapPin, Clock, ExternalLink, type LucideIcon } from 'lucide-react'
import { readPageSectionContent } from '@/lib/cms/page-section-content'
import { getSettingValue } from '@/lib/data/settings'
import { resolveIcon } from '@/lib/cms/icon-map'

const VK_URL = 'https://vk.com/ra2x2'

interface ContactInfoItem {
  icon: LucideIcon
  label: string
  value: string
  link: string | null
  external?: boolean
}

/**
 * Fallback-список контактов. Совпадает с текстами из CLAUDE.md:
 * основной +7-932-424-77-40, доп. портфолио +7-904-480-77-40.
 */
const DEFAULT_INFO: ContactInfoItem[] = [
  {
    icon: Phone,
    label: 'По общим вопросам',
    value: '+7 (932) 424-77-40',
    link: 'tel:+79324247740',
  },
  {
    icon: Phone,
    label: 'По вопросам портфолио',
    value: '+7 (904) 480-77-40',
    link: 'tel:+79044807740',
  },
  { icon: Mail, label: 'Email', value: 'Sj_alex86@mail.ru', link: 'mailto:Sj_alex86@mail.ru' },
  { icon: ExternalLink, label: 'ВКонтакте', value: 'vk.com/ra2x2', link: VK_URL, external: true },
  {
    icon: MapPin,
    label: 'Адрес',
    value: 'г. Ханты-Мансийск, ул. Парковая, 92 Б',
    link: null,
  },
  {
    icon: Clock,
    label: 'Режим работы',
    value: 'Пн–Пт: 9:00–19:00, Сб–Вс: на телефоне',
    link: null,
  },
]

type SettingsBag = Record<string, Record<string, string | undefined>>

/**
 * Резолвит binding-путь `"contacts.phone_primary"` в значение из site_settings.
 * Если значения нет — возвращает null.
 */
function resolveBinding(binding: string, bag: SettingsBag): string | null {
  const [ns, key] = binding.split('.')
  if (!ns || !key) return null
  const source = bag[ns]
  if (!source) return null
  return source[key] || null
}

/**
 * Server-wrapper: читает /contacts/contact_info из CMS + fallback.
 * Поддерживает `binding: "contacts.phone_primary"` — значение подставляется
 * из site_settings на сервере.
 */
export default async function ContactInfo() {
  const cms = await readPageSectionContent('/contacts', 'contact_info', 'contact_info')

  let info: ContactInfoItem[] = DEFAULT_INFO

  if (cms && cms.content.items && cms.content.items.length > 0) {
    // Загрузим settings-bag для binding-резолва
    const [contacts, hours, socials] = await Promise.all([
      getSettingValue<Record<string, string | undefined>>('contacts', {}),
      getSettingValue<Record<string, string | undefined>>('business_hours', {}),
      getSettingValue<Record<string, string | undefined>>('socials', {}),
    ])
    const bag: SettingsBag = {
      contacts,
      business_hours: hours,
      socials,
    }

    info = cms.content.items.map((i) => {
      const resolvedValue = i.binding
        ? resolveBinding(i.binding, bag) || i.value || ''
        : i.value || ''
      return {
        icon: resolveIcon(i.icon, Phone),
        label: i.label,
        value: resolvedValue,
        link: i.link || null,
        external: Boolean(i.external),
      }
    }).filter((i) => i.value || i.link)
  }

  return (
    <div className="space-y-6">
      {info.map(({ icon: Icon, label, value, link, external }) => (
        <div
          key={`${label}-${value}`}
          className="flex items-start gap-4 p-4 bg-brand-gray rounded-2xl"
        >
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Icon className="w-5 h-5 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">
              {label}
            </div>
            {link ? (
              <a
                href={link}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="text-brand-dark font-medium hover:text-brand-orange transition-colors break-all"
              >
                {value}
              </a>
            ) : (
              <p className="text-brand-dark font-medium">{value}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
