import { readSectionContent } from '@/lib/cms/section-content'
import { homeFaqItems } from '@/lib/homeFaq'
import FaqPreviewSectionClient, {
  type FaqSectionData,
  type FaqItem,
} from './FaqPreviewSectionClient'

const DEFAULT_DATA: FaqSectionData = {
  headline: 'Частые вопросы',
  subheadline: 'Не нашли ответ — напишите нам, ответим в течение часа',
  items: homeFaqItems.map((q) => ({
    question: q.question,
    answer: q.answer,
    emoji: q.emoji ?? '',
  })),
}

function isFaqArray(v: unknown): v is FaqItem[] {
  return (
    Array.isArray(v) &&
    v.every(
      (s) =>
        s &&
        typeof s === 'object' &&
        typeof (s as { question?: unknown }).question === 'string' &&
        typeof (s as { answer?: unknown }).answer === 'string',
    )
  )
}

export default async function FaqPreviewSection() {
  const cms = await readSectionContent('faq')
  const rawItems = cms?.items

  const items: FaqItem[] = isFaqArray(rawItems)
    ? rawItems.map((s) => ({
        question: typeof s.question === 'string' ? s.question : '',
        answer: typeof s.answer === 'string' ? s.answer : '',
        emoji: typeof s.emoji === 'string' ? s.emoji : '',
      }))
    : DEFAULT_DATA.items

  const data: FaqSectionData = {
    headline: typeof cms?.headline === 'string' ? cms.headline : DEFAULT_DATA.headline,
    subheadline: typeof cms?.subheadline === 'string' ? cms.subheadline : DEFAULT_DATA.subheadline,
    items,
  }

  return <FaqPreviewSectionClient data={data} />
}
