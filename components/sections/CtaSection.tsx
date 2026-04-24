import { readSectionContent, getSettingValue } from '@/lib/cms/section-content'
import CtaSectionClient, { type CtaSectionData } from './CtaSectionClient'

const DEFAULT_DATA: Omit<CtaSectionData, 'phone_number' | 'phone_display'> = {
  headline: 'Расскажите о задаче',
  subheadline:
    'Пришлём расчёт за час. Замер и фотомонтаж — бесплатно. Работаем по всему ХМАО и ЯНАО.',
  button_text: 'Получить расчёт',
  button_url: 'quote_modal',
  phone_text: 'Позвонить',
}

interface ContactsValue {
  phone_primary?: string
  phone_secondary?: string
}

interface Props {
  /** Используется при ре-рендере на /about — позволяет переопределить заголовок. */
  title?: string
  subtitle?: string
}

function digitsOnly(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (!cleaned) return '+79324247740'
  return cleaned
}

export default async function CtaSection({ title, subtitle }: Props = {}) {
  const cms = await readSectionContent('cta')
  const contacts = await getSettingValue<ContactsValue>('contacts', {
    phone_primary: '+7-932-424-77-40',
    phone_secondary: '+7-904-480-77-40',
  })

  const phoneDisplay = contacts.phone_primary || '+7-932-424-77-40'

  const data: CtaSectionData = {
    headline: title ?? (typeof cms?.headline === 'string' ? cms.headline : DEFAULT_DATA.headline),
    subheadline:
      subtitle ??
      (typeof cms?.subheadline === 'string' ? cms.subheadline : DEFAULT_DATA.subheadline),
    button_text: typeof cms?.button_text === 'string' ? cms.button_text : DEFAULT_DATA.button_text,
    button_url:
      typeof cms?.button_url === 'string' && cms.button_url.length > 0
        ? cms.button_url
        : DEFAULT_DATA.button_url,
    phone_text: typeof cms?.phone_text === 'string' ? cms.phone_text : DEFAULT_DATA.phone_text,
    phone_number: digitsOnly(phoneDisplay),
    phone_display: phoneDisplay,
  }

  return <CtaSectionClient data={data} />
}
