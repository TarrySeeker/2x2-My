/**
 * Минимальный markdown-рендерер для стартовых статей блога.
 *
 * Поддерживает: H1 (#), H2 (##), H3 (###), списки (- item), bold (**text**),
 * абзацы. Без зависимостей. Достаточно для `content/blog-starters.ts`.
 *
 * Когда появится админка с TipTap / Sanity — этот компонент можно заменить
 * на полноценный react-markdown или rich-text renderer.
 *
 * Ведёт: seo-specialist (D-107).
 */

import type { ReactNode } from 'react'

type Props = {
  source: string
  className?: string
}

function renderInline(text: string): ReactNode {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export default function SimpleMarkdown({ source, className = '' }: Props) {
  const blocks: ReactNode[] = []
  const lines = source.split('\n')
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip blank lines
    if (!line.trim()) {
      i++
      continue
    }

    // H1
    if (line.startsWith('# ')) {
      blocks.push(
        <h1 key={key++} className="font-display text-3xl font-black text-brand-dark md:text-4xl">
          {line.slice(2)}
        </h1>,
      )
      i++
      continue
    }

    // H2
    if (line.startsWith('## ')) {
      blocks.push(
        <h2 key={key++} className="mt-10 font-display text-2xl font-bold text-brand-dark md:text-3xl">
          {line.slice(3)}
        </h2>,
      )
      i++
      continue
    }

    // H3
    if (line.startsWith('### ')) {
      blocks.push(
        <h3 key={key++} className="mt-6 font-display text-xl font-semibold text-brand-dark">
          {line.slice(4)}
        </h3>,
      )
      i++
      continue
    }

    // List (- item)
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
        i++
      }
      blocks.push(
        <ul key={key++} className="ml-6 list-disc space-y-1 text-neutral-700">
          {items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ul>,
      )
      continue
    }

    // Ordered list (1. item)
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        i++
      }
      blocks.push(
        <ol key={key++} className="ml-6 list-decimal space-y-1 text-neutral-700">
          {items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ol>,
      )
      continue
    }

    // Paragraph
    blocks.push(
      <p key={key++} className="leading-relaxed text-neutral-700">
        {renderInline(line)}
      </p>,
    )
    i++
  }

  return <div className={`space-y-4 ${className}`}>{blocks}</div>
}
