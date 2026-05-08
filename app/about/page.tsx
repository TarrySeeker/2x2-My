import AboutHero from '@/components/sections/about/AboutHero'
import AboutStory from '@/components/sections/about/AboutStory'
import AboutValues from '@/components/sections/about/AboutValues'
import AboutTeam from '@/components/sections/about/AboutTeam'
import CtaSection from '@/components/sections/CtaSection'
import { makeGenerateMetadata } from '@/lib/seo/metadata-cms'
import { JsonLdScript, buildBreadcrumbList } from '@/lib/seo/json-ld'

// CMS-driven (hero/story/values + team из БД). См. app/page.tsx.
export const dynamic = 'force-dynamic'

export const generateMetadata = makeGenerateMetadata({
  path: '/about',
  fallback: {
    // Title укорочён с 60 до 50 символов; добавляется ` | 2х2` из layout.
    title: 'О компании — рекламное агентство в Ханты-Мансийске',
    description:
      'Рекламная компания «2х2» — 10+ лет на рынке ХМАО. Делали вывески для ВТБ, стелы АЗС «АртСевер», оформление ЮКИОР, световые фигуры Брусники. 500+ проектов в Ханты-Мансийске и Сургуте.',
    keywords: [
      'о компании 2х2',
      'рекламное агентство ханты-мансийск',
      'реклама хмао опыт',
    ],
  },
})

export default function AboutPage() {
  return (
    <main>
      <JsonLdScript
        data={buildBreadcrumbList([
          { name: 'Главная', url: '/' },
          { name: 'О компании', url: '/about' },
        ])}
      />
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
