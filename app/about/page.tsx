import type { Metadata } from 'next'
import AboutHero from '@/components/sections/about/AboutHero'
import AboutStory from '@/components/sections/about/AboutStory'
import AboutValues from '@/components/sections/about/AboutValues'
import AboutTeam from '@/components/sections/about/AboutTeam'
import CtaSection from '@/components/sections/CtaSection'

export const metadata: Metadata = {
  title: 'О компании',
  description: 'Рекламное агентство 2×2 — 10 лет опыта, 500+ проектов, команда 25 специалистов.',
}

export default function AboutPage() {
  return (
    <main>
      <AboutHero />
      <AboutStory />
      <AboutValues />
      <AboutTeam />
      <CtaSection
        title="Хотите работать с нами?"
        subtitle="Свяжитесь — обсудим ваш проект и рассчитаем стоимость"
      />
    </main>
  )
}
