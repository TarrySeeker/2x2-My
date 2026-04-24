'use client'

import Link from 'next/link'

export interface PdConsentStrings {
  /** Текст до ссылки, напр. «Нажимая кнопку, я соглашаюсь с» */
  prefix: string
  /** Текст самой ссылки, напр. «политикой конфиденциальности» */
  linkText: string
  /** Текст после ссылки, напр. «и даю согласие на обработку персональных данных.» */
  suffix: string
  /** URL политики (обычно /privacy). */
  href: string
}

const DEFAULT_STRINGS: PdConsentStrings = {
  prefix: 'Нажимая кнопку, я соглашаюсь с',
  linkText: 'политикой конфиденциальности',
  suffix: 'и даю согласие на обработку персональных данных.',
  href: '/privacy',
}

interface PdConsentFieldProps {
  checked: boolean
  onChange: (next: boolean) => void
  error?: string
  /** Отдельный id, если на странице несколько форм (нельзя дублировать). */
  id?: string
  /** Переопределяем строки. Если не передано — используется fallback. */
  strings?: PdConsentStrings
}

/**
 * Чекбокс согласия на обработку ПД (152-ФЗ). Обязателен в любой форме
 * обратной связи (master-plan правка C.security).
 *
 * Строки можно переопределить через `strings`. Если не передано —
 * используются русские fallback-тексты. Client component: текст обычно
 * пробрасывается из server-wrapper, прочитавшего ui_strings.
 */
export default function PdConsentField({
  checked,
  onChange,
  error,
  id = 'pd-consent',
  strings = DEFAULT_STRINGS,
}: PdConsentFieldProps) {
  return (
    <div>
      {/*
        Safari/WebKit quirk: вложенный <Link> внутри <label htmlFor>
        приводит к нестабильному click-делегированию — иногда клик по
        ссылке переключает чекбокс, иногда нет (зависит от touch vs mouse,
        delegatesFocus и Mobile Safari "ghost click"). Поэтому label
        связан с input через id, а ссылка рендерится сиблингом.
      */}
      <div className="flex items-start gap-3">
        <input
          id={id}
          name="pdConsent"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error ? 'true' : undefined}
          aria-required="true"
          className="mt-1 h-5 w-5 shrink-0 cursor-pointer rounded border-neutral-300 text-brand-orange accent-[#FF6B00] focus:ring-brand-orange/30"
        />
        <label
          htmlFor={id}
          className="text-sm leading-relaxed text-neutral-600 cursor-pointer select-none"
        >
          {strings.prefix}{' '}
          <Link
            href={strings.href}
            className="text-brand-orange underline-offset-2 hover:underline"
            onClick={(e) => e.stopPropagation()}
            target="_blank"
            rel="noopener"
          >
            {strings.linkText}
          </Link>{' '}
          {strings.suffix}
        </label>
      </div>
      {error && (
        <p className="mt-1.5 pl-8 text-xs font-medium text-[var(--color-danger)]">{error}</p>
      )}
    </div>
  )
}
