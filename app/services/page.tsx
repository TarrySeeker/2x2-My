import ServicesHero from '@/components/sections/services/ServicesHero'
import ServicesCards from '@/components/sections/services/ServicesCards'
import CtaSection from '@/components/sections/CtaSection'
import JsonLd from '@/components/JsonLd'
import { siteUrl } from '@/lib/siteConfig'
import { readPageSectionContent } from '@/lib/cms/page-section-content'
import { makeGenerateMetadata } from '@/lib/seo/metadata-cms'

const servicesSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Услуги рекламного агентства 2×2',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Полиграфия',
      url: `${siteUrl}/services#polygraphy`,
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Наружная реклама',
      url: `${siteUrl}/services#outdoor`,
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Оформление фасадов',
      url: `${siteUrl}/services#facades`,
    },
  ],
}

import { JsonLdScript, buildBreadcrumbList } from '@/lib/seo/json-ld'

export const generateMetadata = makeGenerateMetadata({
  path: '/services',
  fallback: {
    title: 'Услуги рекламной компании «2х2» — полиграфия, наружная реклама, фасады',
    description:
      'Полный спектр рекламных услуг в Ханты-Мансийске: печать визиток, листовок, вывески, световые буквы, стелы, оформление фасадов. Онлайн-калькулятор и стартовые цены.',
    keywords: [
      'услуги рекламной компании',
      'реклама под ключ ханты-мансийск',
      'полиграфия и наружная реклама',
    ],
  },
})

export default async function ServicesPage() {
  const heroCms = await readPageSectionContent('/services', 'hero', 'hero')
  const heroBadge = heroCms?.content.badge || undefined
  const heroTitle = heroCms?.content.title || undefined
  const heroDescription = heroCms?.content.description || undefined

  return (
    <main>
      <JsonLd data={servicesSchema} />
      <JsonLdScript
        data={buildBreadcrumbList([
          { name: 'Главная', url: '/' },
          { name: 'Услуги', url: '/services' },
        ])}
      />
      <ServicesHero badge={heroBadge} title={heroTitle} description={heroDescription} />
      <ServicesCards />
      <CtaSection />
    </main>
  )
}
