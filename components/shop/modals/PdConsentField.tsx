'use client'

import Link from 'next/link'

interface PdConsentFieldProps {
  checked: boolean
  onChange: (next: boolean) => void
  error?: string
  /** Отдельный id, если на странице несколько форм (нельзя дублировать). */
  id?: string
}

/**
 * Чекбокс согласия на обработку ПД (152-ФЗ). Обязателен в любой форме
 * обратной связи (master-plan правка C.security).
 *
 * Тексты — наша короткая фразировка. Основная политика — по ссылке /privacy.
 */
export default function PdConsentField({
  checked,
  onChange,
  error,
  id = 'pd-consent',
}: PdConsentFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 group">
        <input
          id={id}
          name="pdConsent"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? 'true' : undefined}
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
      {error && (
        <p className="mt-1.5 pl-8 text-xs font-medium text-[var(--color-danger)]">{error}</p>
      )}
    </div>
  )
}
