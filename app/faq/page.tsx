import type { Metadata } from 'next'
import Accordion from '@/components/ui/Accordion'
import AnimatedSection from '@/components/ui/AnimatedSection'
import ServicesHero from '@/components/sections/services/ServicesHero'
import CtaSection from '@/components/sections/CtaSection'
import JsonLd from '@/components/JsonLd'
import { faqPageItems } from '@/lib/faqPageItems'

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqPageItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer },
  })),
}

export const metadata: Metadata = {
  title: 'Часто задаваемые вопросы',
  description: 'Ответы на частые вопросы о работе рекламного агентства 2×2.',
}

export default function FaqPage() {
  return (
    <main>
      <JsonLd data={faqSchema} />
      <ServicesHero
        badge="FAQ"
        title="Частые вопросы"
        description="Отвечаем на самые популярные вопросы наших клиентов"
      />
      <section className="section-padding bg-white">
        <div className="container max-w-3xl">
          <AnimatedSection>
            <Accordion items={faqPageItems} />
          </AnimatedSection>
        </div>
      </section>
      <CtaSection title="Остались вопросы?" subtitle="Позвоните или напишите — ответим быстро и развёрнуто" />
    </main>
  )
}
