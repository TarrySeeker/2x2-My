'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'

export interface ContactFormStrings {
  // Labels
  nameLabel: string
  namePlaceholder: string
  phoneLabel: string
  phonePlaceholder: string
  emailLabel: string
  emailPlaceholder: string
  serviceLabel: string
  serviceDefaultOption: string
  servicePolygraphy: string
  serviceOutdoor: string
  serviceFacades: string
  serviceOther: string
  messageLabel: string
  messagePlaceholder: string
  // Buttons / states
  submitLabel: string
  submitSending: string
  successTitle: string
  successText: string
  successRetry: string
  errorText: string
  // Consent
  consentPrefix: string
  consentLinkText: string
  consentSuffix: string
  // Validation
  nameRequired: string
  nameMin: string
  phoneRequired: string
  phoneInvalid: string
  emailInvalid: string
  messageRequired: string
  messageMin: string
  consentRequired: string
}

export interface ContactFormClientProps {
  strings: ContactFormStrings
  phoneDisplay: string
  phoneTel: string
}

type FormData = {
  name: string
  phone: string
  email: string
  service: string
  message: string
  consent: boolean
}

interface ContactApiResponse {
  success?: boolean
  duplicate?: boolean
  id?: number
  error?: string
}

function makeIdempotencyKey() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Клиентская часть контактной формы (страница /contacts).
 * Строки приходят пропсами из `ContactForm.tsx` (server-wrapper),
 * который читает их из `ui_strings`.
 *
 * Этап CMS-миграции (2026-04-24):
 *  - Все labels/placeholders/успехи/ошибки — через props.strings.
 *  - Телефон в error-блоке — из site_settings.contacts.phone_primary.
 */
export default function ContactFormClient({
  strings,
  phoneDisplay,
  phoneTel,
}: ContactFormClientProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => makeIdempotencyKey())
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { consent: false },
  })

  const consentChecked = watch('consent')

  const subjectByService = useMemo<Record<string, string>>(
    () => ({
      polygraphy: strings.servicePolygraphy,
      outdoor: strings.serviceOutdoor,
      facades: strings.serviceFacades,
      other: strings.serviceOther,
    }),
    [
      strings.servicePolygraphy,
      strings.serviceOutdoor,
      strings.serviceFacades,
      strings.serviceOther,
    ],
  )

  const onSubmit = async (data: FormData) => {
    // Жёсткая client-side защита: без согласия на обработку ПД не отправляем
    // ничего на сервер. React Hook Form сам валидирует required, но на
    // WebKit/Mobile Safari кнопка submit иногда срабатывает раньше, чем
    // React успевает прокинуть disabled — подстраховываемся явной проверкой.
    if (!data.consent) {
      setStatus('error')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          name: data.name,
          phone: data.phone || undefined,
          email: data.email || undefined,
          subject: subjectByService[data.service] ?? data.service ?? null,
          message: data.message,
          pdConsent: true,
        }),
      })
      const json = (await res.json().catch(() => null)) as ContactApiResponse | null
      if (!res.ok || !(json?.success === true || !!json?.id)) {
        setStatus('error')
        return
      }
      setStatus('success')
      reset({ consent: false } as Partial<FormData>)
      setIdempotencyKey(makeIdempotencyKey())
    } catch {
      setStatus('error')
    }
  }

  const inputCls = (hasError: boolean) =>
    `w-full px-4 py-3 rounded-xl border-2 text-sm transition-colors duration-200 outline-none
     focus:border-brand-orange ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`

  if (status === 'success')
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-brand-dark mb-2">{strings.successTitle}</h3>
        <p className="text-gray-500 mb-6">{strings.successText}</p>
        <button type="button" onClick={() => setStatus('idle')} className="btn-outline">
          {strings.successRetry}
        </button>
      </div>
    )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="text-sm font-medium text-brand-dark mb-1 block">
            {strings.nameLabel}
          </label>
          <input
            id="contact-name"
            autoComplete="name"
            placeholder={strings.namePlaceholder}
            className={inputCls(!!errors.name)}
            {...register('name', {
              required: strings.nameRequired,
              minLength: { value: 2, message: strings.nameMin },
            })}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label
            htmlFor="contact-phone"
            className="text-sm font-medium text-brand-dark mb-1 block"
          >
            {strings.phoneLabel}
          </label>
          <input
            id="contact-phone"
            type="tel"
            autoComplete="tel"
            placeholder={strings.phonePlaceholder}
            className={inputCls(!!errors.phone)}
            {...register('phone', {
              required: strings.phoneRequired,
              pattern: { value: /^[\d\s+\-()]{10,}$/, message: strings.phoneInvalid },
            })}
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="contact-email" className="text-sm font-medium text-brand-dark mb-1 block">
          {strings.emailLabel}
        </label>
        <input
          id="contact-email"
          placeholder={strings.emailPlaceholder}
          type="email"
          autoComplete="email"
          className={inputCls(!!errors.email)}
          {...register('email', {
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: strings.emailInvalid },
          })}
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label
          htmlFor="contact-service"
          className="text-sm font-medium text-brand-dark mb-1 block"
        >
          {strings.serviceLabel}
        </label>
        <select id="contact-service" className={inputCls(false)} {...register('service')}>
          <option value="">{strings.serviceDefaultOption}</option>
          <option value="polygraphy">{strings.servicePolygraphy}</option>
          <option value="outdoor">{strings.serviceOutdoor}</option>
          <option value="facades">{strings.serviceFacades}</option>
          <option value="other">{strings.serviceOther}</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-brand-dark mb-1 block" htmlFor="contact-task">
          {strings.messageLabel}
        </label>
        <textarea
          id="contact-task"
          aria-label={strings.messageLabel}
          placeholder={strings.messagePlaceholder}
          rows={4}
          className={`${inputCls(!!errors.message)} resize-none`}
          {...register('message', {
            required: strings.messageRequired,
            minLength: { value: 5, message: strings.messageMin },
          })}
        />
        {errors.message && (
          <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-3" htmlFor="contact-consent">
        <input
          id="contact-consent"
          type="checkbox"
          {...register('consent', { required: true })}
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border-neutral-300 text-brand-orange accent-[#FF6B00] focus:ring-brand-orange/30"
        />
        <span className="text-sm leading-relaxed text-neutral-600">
          {strings.consentPrefix}{' '}
          <Link href="/privacy" className="text-brand-orange underline-offset-2 hover:underline">
            {strings.consentLinkText}
          </Link>{' '}
          {strings.consentSuffix}
        </span>
      </label>
      {errors.consent && (
        <p className="text-red-500 text-xs">{strings.consentRequired}</p>
      )}

      {status === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {strings.errorText}{' '}
          <a href={`tel:${phoneTel}`} className="font-bold">
            {phoneDisplay}
          </a>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !consentChecked}
        className="w-full btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
        {status === 'loading' ? strings.submitSending : strings.submitLabel}
      </button>
    </form>
  )
}
