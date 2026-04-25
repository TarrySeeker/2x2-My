'use client'

import { useId, useState } from 'react'
import { Tag } from 'lucide-react'
import Input from '@/components/ui/Input'

export interface PromoCodeStrings {
  /** Кнопка-раскрытие, напр. «Есть промокод?» */
  toggleLabel: string
  /** Label поля промокода, напр. «Промокод» */
  fieldLabel: string
  /** Placeholder, напр. «Если есть» */
  placeholder: string
  /** Сообщение об ошибке формата (только латиница/цифры/_-, длина 4..50). */
  formatError: string
}

export const DEFAULT_PROMO_STRINGS: PromoCodeStrings = {
  toggleLabel: 'Есть промокод?',
  fieldLabel: 'Промокод',
  placeholder: 'Если есть',
  formatError: 'Только латиница, цифры, _ и -',
}

const PROMO_REGEX = /^[A-Za-z0-9_-]{4,50}$/

/**
 * Лёгкая клиент-валидация промокода без обращения к серверу:
 *  - пустая строка → ok (поле опциональное)
 *  - длина < 4 или > 50 / содержит не-ASCII → ошибка формата
 *
 * Серверная Zod-схема (`promoCodeSchema` в `lib/validation.ts`)
 * применяет ровно тот же regex — синхронизированы.
 */
export function validatePromoCode(value: string): string | null {
  if (!value || value.trim().length === 0) return null
  return PROMO_REGEX.test(value.trim()) ? null : 'invalid'
}

interface PromoCodeFieldProps {
  value: string
  onChange: (next: string) => void
  /** Сообщение об ошибке (если родитель валидирует на submit). */
  error?: string
  strings?: PromoCodeStrings
  /** Уникальный id (важно если на странице несколько форм). */
  id?: string
}

/**
 * Опциональное поле «Промокод» для форм заявок.
 *
 * UX: collapsed по умолчанию (ссылка-toggle «Есть промокод?»),
 * чтобы не загромождать форму. Раскрывается → Input. Это сознательный
 * выбор: 95%+ заявок промокода не имеют, но если клиент пришёл с акции —
 * его цель найти поле очевидна.
 *
 * Сам по себе НЕ блокирует submit — родительский компонент решает,
 * валидировать ли формат. Лёгкая client-валидация — `validatePromoCode`.
 */
export default function PromoCodeField({
  value,
  onChange,
  error,
  strings = DEFAULT_PROMO_STRINGS,
  id,
}: PromoCodeFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? `promo-${generatedId}`
  // Сразу раскрываем, если уже что-то введено (например после возврата
  // через back-button — браузер восстановил value, а expanded — нет).
  const [expanded, setExpanded] = useState<boolean>(value.length > 0)

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="self-start inline-flex items-center gap-1.5 text-sm text-brand-orange hover:underline underline-offset-2"
      >
        <Tag className="h-3.5 w-3.5" />
        {strings.toggleLabel}
      </button>
    )
  }

  return (
    <Input
      id={fieldId}
      label={strings.fieldLabel}
      name="promoCode"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={strings.placeholder}
      leftSlot={<Tag className="h-4 w-4" />}
      error={error}
      maxLength={50}
      autoComplete="off"
      autoCapitalize="characters"
      spellCheck={false}
    />
  )
}
