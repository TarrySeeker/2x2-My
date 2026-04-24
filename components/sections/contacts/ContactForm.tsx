import { getAllUiStrings } from '@/lib/data/ui-strings'
import { getSettingValue } from '@/lib/data/settings'
import ContactFormClient, { type ContactFormStrings } from './ContactFormClient'

interface ContactsValue {
  phone_primary?: string
  phone_secondary?: string
  email?: string
  address?: string
}

const DEFAULT_CONTACTS: ContactsValue = {
  phone_primary: '+7-932-424-77-40',
}

/**
 * Fallback-строки — совпадают с tekстами из migrations/011_ui_strings.sql
 * и /content/empty-states.ts. При пустой БД форма выглядит/работает как
 * раньше.
 */
const FALLBACK: ContactFormStrings = {
  nameLabel: 'Имя *',
  namePlaceholder: 'Ваше имя',
  phoneLabel: 'Телефон *',
  phonePlaceholder: '+7 (900) 000-00-00',
  emailLabel: 'Email',
  emailPlaceholder: 'your@email.ru',
  serviceLabel: 'Услуга',
  serviceDefaultOption: 'Выберите услугу',
  servicePolygraphy: 'Полиграфия',
  serviceOutdoor: 'Наружная реклама',
  serviceFacades: 'Оформление фасадов',
  serviceOther: 'Другое',
  messageLabel: 'Опишите вашу задачу *',
  messagePlaceholder: 'Что нужно сделать, какие сроки, есть ли референсы...',
  submitLabel: 'Отправить заявку',
  submitSending: 'Отправляем...',
  successTitle: 'Заявка отправлена!',
  successText: 'Перезвоним в течение часа в рабочее время.',
  successRetry: 'Отправить ещё',
  errorText: 'Ошибка отправки. Позвоните нам:',
  consentPrefix: 'Нажимая кнопку, я соглашаюсь с',
  consentLinkText: 'политикой конфиденциальности',
  consentSuffix: 'и даю согласие на обработку персональных данных.',
  nameRequired: 'Введите имя',
  nameMin: 'Минимум 2 символа',
  phoneRequired: 'Введите телефон',
  phoneInvalid: 'Некорректный номер',
  emailInvalid: 'Некорректный email',
  messageRequired: 'Опишите задачу',
  messageMin: 'Слишком коротко',
  consentRequired: 'Нужно согласие на обработку персональных данных',
}

function pick(
  dict: Record<string, string>,
  key: string,
  fallback: string,
): string {
  const v = dict[key]
  return v && v.length > 0 ? v : fallback
}

function digitsOnly(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (!cleaned) return '+79324247740'
  return cleaned
}

/**
 * Server-обёртка контактной формы (страница /contacts).
 * Читает все необходимые микротексты из ui_strings (namespaces:
 * forms, validation, agreements). Телефон в error-блоке — из
 * site_settings.contacts.
 */
export default async function ContactForm() {
  const dict = await getAllUiStrings()
  const contacts = await getSettingValue<ContactsValue>('contacts', DEFAULT_CONTACTS)

  const phoneDisplay = contacts.phone_primary || DEFAULT_CONTACTS.phone_primary!
  const phoneTel = digitsOnly(phoneDisplay)

  // Текст согласия в БД хранится в markdown:
  // «Нажимая кнопку, я соглашаюсь с [политикой конфиденциальности](/privacy)…»
  // Парсим на три части (до, ссылка, после). Если парсинг не удался — fallback.
  const agreementRaw = dict['agreement.privacy_markdown'] || ''
  let consentPrefix = FALLBACK.consentPrefix
  let consentLinkText = FALLBACK.consentLinkText
  let consentSuffix = FALLBACK.consentSuffix
  const m = /^([\s\S]*?)\[([^\]]+)\]\([^)]+\)([\s\S]*)$/.exec(agreementRaw)
  if (m) {
    consentPrefix = m[1]!.trim()
    consentLinkText = m[2]!.trim()
    consentSuffix = m[3]!.trim()
  }

  const strings: ContactFormStrings = {
    nameLabel: pick(dict, 'form.contact.name_label', FALLBACK.nameLabel),
    namePlaceholder: pick(dict, 'form.contact.name_placeholder', FALLBACK.namePlaceholder),
    phoneLabel: pick(dict, 'form.contact.phone_label', FALLBACK.phoneLabel),
    phonePlaceholder: pick(dict, 'form.contact.phone_placeholder', FALLBACK.phonePlaceholder),
    emailLabel: pick(dict, 'form.contact.email_label', FALLBACK.emailLabel),
    emailPlaceholder: pick(dict, 'form.contact.email_placeholder', FALLBACK.emailPlaceholder),
    serviceLabel: pick(dict, 'form.contact.service_label', FALLBACK.serviceLabel),
    serviceDefaultOption: pick(
      dict,
      'form.contact.service_default_option',
      FALLBACK.serviceDefaultOption,
    ),
    servicePolygraphy: pick(
      dict,
      'form.contact.service_polygraphy',
      FALLBACK.servicePolygraphy,
    ),
    serviceOutdoor: pick(dict, 'form.contact.service_outdoor', FALLBACK.serviceOutdoor),
    serviceFacades: pick(dict, 'form.contact.service_facades', FALLBACK.serviceFacades),
    serviceOther: pick(dict, 'form.contact.service_other', FALLBACK.serviceOther),
    messageLabel: pick(dict, 'form.contact.message_label', FALLBACK.messageLabel),
    messagePlaceholder: pick(
      dict,
      'form.contact.message_placeholder',
      FALLBACK.messagePlaceholder,
    ),
    submitLabel: pick(dict, 'form.contact.submit_label', FALLBACK.submitLabel),
    submitSending: pick(dict, 'form.contact.submit_sending', FALLBACK.submitSending),
    successTitle: pick(dict, 'form.contact.success_title', FALLBACK.successTitle),
    successText: pick(dict, 'form.contact.success_text', FALLBACK.successText),
    successRetry: pick(dict, 'form.contact.success_retry', FALLBACK.successRetry),
    errorText: pick(dict, 'form.contact.error_text', FALLBACK.errorText),
    consentPrefix,
    consentLinkText,
    consentSuffix,
    nameRequired: pick(dict, 'validation.name_required', FALLBACK.nameRequired),
    nameMin: FALLBACK.nameMin,
    phoneRequired: pick(dict, 'validation.phone_required', FALLBACK.phoneRequired),
    phoneInvalid: pick(dict, 'validation.phone_invalid', FALLBACK.phoneInvalid),
    emailInvalid: pick(dict, 'validation.email_invalid', FALLBACK.emailInvalid),
    messageRequired: pick(dict, 'validation.message_required', FALLBACK.messageRequired),
    messageMin: FALLBACK.messageMin,
    consentRequired: pick(
      dict,
      'validation.agreement_required',
      FALLBACK.consentRequired,
    ),
  }

  return (
    <ContactFormClient
      strings={strings}
      phoneDisplay={phoneDisplay}
      phoneTel={phoneTel}
    />
  )
}
