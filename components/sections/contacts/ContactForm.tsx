'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { CheckCircle2, Loader2 } from 'lucide-react'
import Link from 'next/link'

// Основной номер «по общим вопросам» — совпадает с Header/Footer и «По общим
// вопросам» в ContactInfo. Был +7-904 (портфолио), что расходилось с остальным
// сайтом и путало клиента (QA 2026-04-24, P1-7).
const PHONE_DISPLAY = '+7-932-424-77-40'
const PHONE_TEL = '+79324247740'

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
 * Контактная форма (страница /contacts).
 *
 * Этап 4 (master-plan правка C):
 *  - Отправка через /api/contact (вместо emailjs)
 *  - Обязательное pdConsent
 *  - Idempotency-Key (один на загрузку формы, перегенерация после успеха)
 *  - Лейбл изменён: «Сообщение» → «Опишите вашу задачу»
 */
export default function ContactForm() {
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
      polygraphy: 'Полиграфия',
      outdoor: 'Наружная реклама',
      facades: 'Оформление фасадов',
      other: 'Другое',
    }),
    [],
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
        <h3 className="text-xl font-bold text-brand-dark mb-2">Заявка отправлена!</h3>
        <p className="text-gray-500 mb-6">Перезвоним в течение часа в рабочее время.</p>
        <button type="button" onClick={() => setStatus('idle')} className="btn-outline">
          Отправить ещё
        </button>
      </div>
    )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="text-sm font-medium text-brand-dark mb-1 block">
            Имя *
          </label>
          <input
            id="contact-name"
            autoComplete="name"
            placeholder="Ваше имя"
            className={inputCls(!!errors.name)}
            {...register('name', {
              required: 'Введите имя',
              minLength: { value: 2, message: 'Минимум 2 символа' },
            })}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label
            htmlFor="contact-phone"
            className="text-sm font-medium text-brand-dark mb-1 block"
          >
            Телефон *
          </label>
          <input
            id="contact-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+7 (900) 000-00-00"
            className={inputCls(!!errors.phone)}
            {...register('phone', {
              required: 'Введите телефон',
              pattern: { value: /^[\d\s+\-()]{10,}$/, message: 'Некорректный номер' },
            })}
          />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="contact-email" className="text-sm font-medium text-brand-dark mb-1 block">
          Email
        </label>
        <input
          id="contact-email"
          placeholder="your@email.ru"
          type="email"
          autoComplete="email"
          className={inputCls(!!errors.email)}
          {...register('email', {
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Некорректный email' },
          })}
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label
          htmlFor="contact-service"
          className="text-sm font-medium text-brand-dark mb-1 block"
        >
          Услуга
        </label>
        <select id="contact-service" className={inputCls(false)} {...register('service')}>
          <option value="">Выберите услугу</option>
          <option value="polygraphy">Полиграфия</option>
          <option value="outdoor">Наружная реклама</option>
          <option value="facades">Оформление фасадов</option>
          <option value="other">Другое</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-brand-dark mb-1 block" htmlFor="contact-task">
          Опишите вашу задачу *
        </label>
        <textarea
          id="contact-task"
          aria-label="Опишите вашу задачу"
          placeholder="Что нужно сделать, какие сроки, есть ли референсы..."
          rows={4}
          className={`${inputCls(!!errors.message)} resize-none`}
          {...register('message', {
            required: 'Опишите задачу',
            minLength: { value: 5, message: 'Слишком коротко' },
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
          Нажимая кнопку, я соглашаюсь с{' '}
          <Link href="/privacy" className="text-brand-orange underline-offset-2 hover:underline">
            политикой конфиденциальности
          </Link>{' '}
          и даю согласие на обработку персональных данных.
        </span>
      </label>
      {errors.consent && (
        <p className="text-red-500 text-xs">Нужно согласие на обработку персональных данных</p>
      )}

      {status === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          Ошибка отправки. Позвоните нам:{' '}
          <a href={`tel:${PHONE_TEL}`} className="font-bold">
            {PHONE_DISPLAY}
          </a>
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'loading' || !consentChecked}
        className="w-full btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
        {status === 'loading' ? 'Отправляем...' : 'Отправить заявку'}
      </button>
    </form>
  )
}
