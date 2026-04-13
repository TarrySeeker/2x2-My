'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import emailjs from '@emailjs/browser'
import { EMAILJS_CONFIG } from '@/lib/emailjs'
import { CheckCircle2, Loader2 } from 'lucide-react'

const PHONE_DISPLAY = '+7-904-480-77-40'
const PHONE_TEL = '+79044807740'

type FormData = {
  name: string
  phone: string
  email: string
  service: string
  message: string
}

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>()

  const onSubmit = async (data: FormData) => {
    setStatus('loading')
    try {
      await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
        from_name: data.name,
        phone: data.phone,
        email: data.email,
        service: data.service,
        message: data.message,
      }, EMAILJS_CONFIG.publicKey)
      setStatus('success')
      reset()
    } catch {
      setStatus('error')
    }
  }

  const inputCls = (hasError: boolean) =>
    `w-full px-4 py-3 rounded-xl border-2 text-sm transition-colors duration-200 outline-none
     focus:border-brand-orange ${hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`

  if (status === 'success') return (
    <div className="text-center py-12">
      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-brand-dark mb-2">Заявка отправлена!</h3>
      <p className="text-gray-500 mb-6">Перезвоним в течение часа в рабочее время.</p>
      <button type="button" onClick={() => setStatus('idle')} className="btn-outline">Отправить ещё</button>
    </div>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-brand-dark mb-1 block">Имя *</label>
          <input placeholder="Ваше имя"
            className={inputCls(!!errors.name)}
            {...register('name', { required: 'Введите имя', minLength: { value: 2, message: 'Минимум 2 символа' } })} />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="text-sm font-medium text-brand-dark mb-1 block">Телефон *</label>
          <input placeholder="+7 (900) 000-00-00"
            className={inputCls(!!errors.phone)}
            {...register('phone', { required: 'Введите телефон', pattern: { value: /^[\d\s\+\-\(\)]{10,}$/, message: 'Некорректный номер' } })} />
          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-brand-dark mb-1 block">Email</label>
        <input placeholder="your@email.ru" type="email"
          className={inputCls(!!errors.email)}
          {...register('email', { pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Некорректный email' } })} />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium text-brand-dark mb-1 block">Услуга</label>
        <select className={inputCls(false)} {...register('service')}>
          <option value="">Выберите услугу</option>
          <option value="polygraphy">Полиграфия</option>
          <option value="outdoor">Наружная реклама</option>
          <option value="facades">Оформление фасадов</option>
          <option value="other">Другое</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-brand-dark mb-1 block">Сообщение</label>
        <textarea placeholder="Расскажите о вашем проекте..." rows={4}
          className={`${inputCls(false)} resize-none`}
          {...register('message')} />
      </div>

      {status === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          Ошибка отправки. Позвоните нам: <a href={`tel:${PHONE_TEL}`} className="font-bold">{PHONE_DISPLAY}</a>
        </div>
      )}

      <button type="submit" disabled={status === 'loading'}
        className="w-full btn-primary py-4 flex items-center justify-center gap-2 disabled:opacity-50">
        {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
        {status === 'loading' ? 'Отправляем...' : 'Отправить заявку'}
      </button>

      <p className="text-gray-400 text-xs text-center">
        Нажимая кнопку, вы соглашаетесь с обработкой персональных данных
      </p>
    </form>
  )
}
