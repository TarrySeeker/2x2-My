import { Phone, Mail, MapPin, Clock, ExternalLink } from 'lucide-react'

const VK_URL = 'https://vk.com/ra2x2'

/**
 * Контактные телефоны — оба номера с чёткими подписями.
 * `+7-932-424-77-40` совпадает с Header (основной — по общим вопросам).
 * `+7-904-480-77-40` — вторая линия (портфолио / срочные вопросы).
 * Источник: CLAUDE.md → «Телефон 1 (сайт) / Телефон 2 (портфолио)».
 */
const info: {
  icon: typeof Phone
  label: string
  value: string
  link: string | null
  external?: boolean
}[] = [
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
  { icon: MapPin, label: 'Адрес', value: 'г. Ханты-Мансийск, ул. Парковая, 92Б', link: null },
  { icon: Clock, label: 'Режим работы', value: 'Пн–Пт: 9:00–19:00, Сб–Вс: на телефоне', link: null },
]

export default function ContactInfo() {
  return (
    <div className="space-y-6">
      {info.map(({ icon: Icon, label, value, link, external }) => (
        <div key={label} className="flex items-start gap-4 p-4 bg-brand-gray rounded-2xl">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <Icon className="w-5 h-5 text-brand-orange" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">{label}</div>
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
