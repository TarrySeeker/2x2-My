import Accordion from '@/components/ui/Accordion'
import ServicesHero from '@/components/sections/services/ServicesHero'
import CtaSection from '@/components/sections/CtaSection'
import JsonLd from '@/components/JsonLd'
import { faqPageItems } from '@/lib/faqPageItems'
import { makeGenerateMetadata } from '@/lib/seo/metadata-cms'
import { readPageSectionContent } from '@/lib/cms/page-section-content'
import { JsonLdScript, buildBreadcrumbList } from '@/lib/seo/json-ld'

// CMS-driven hero + faq items + cta. См. app/page.tsx.
export const dynamic = 'force-dynamic'

export const generateMetadata = makeGenerateMetadata({
  path: '/faq',
  fallback: {
    title: 'FAQ — частые вопросы о рекламе, вывесках, печати в Ханты-Мансийске',
    description:
      'Ответы на частые вопросы: сроки изготовления, стоимость вывески, согласование, монтаж, доставка по ХМАО. Рекламная компания «2х2» Ханты-Мансийск.',
  },
})

export default async function FaqPage() {
  // CMS: /faq/hero + /faq/items + /faq/cta
  const [heroCms, itemsCms, ctaCms] = await Promise.all([
    readPageSectionContent('/faq', 'hero', 'hero'),
    readPageSectionContent('/faq', 'items', 'faq'),
    readPageSectionContent('/faq', 'cta', 'cta'),
  ])

  // Items: CMS приоритет, fallback — faqPageItems
  const items =
    itemsCms?.content.items && itemsCms.content.items.length > 0
      ? itemsCms.content.items.map((i) => ({
          question: i.question,
          answer: i.answer,
          emoji: i.emoji || undefined,
        }))
      : faqPageItems

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }

  return (
    <main>
      <JsonLd data={faqSchema} />
      <JsonLdScript
        data={buildBreadcrumbList([
          { name: 'Главная', url: '/' },
          { name: 'FAQ', url: '/faq' },
        ])}
      />
      <ServicesHero
        badge={heroCms?.content.badge || 'FAQ'}
        title={heroCms?.content.title || 'Частые вопросы'}
        description={
          heroCms?.content.description ||
          'Отвечаем на самые популярные вопросы наших клиентов'
        }
      />
      <section className="section-padding bg-white">
        <div className="container max-w-3xl">
          {/*
            AnimatedSection (slide-up + fade-in появление) убран по
            правке клиента 2026-04-25 — «убрать анимированное появление»
            вопросов. Анимация открытия/закрытия аккордеона
            (AnimatePresence в Accordion.tsx) сохранена.
          */}
          <Accordion items={items} />
        </div>
      </section>
      <CtaSection
        title={ctaCms?.content.headline || 'Остались вопросы?'}
        subtitle={
          ctaCms?.content.subheadline ||
          'Позвоните или напишите — ответим быстро и развёрнуто'
        }
      />
    </main>
  )
}
