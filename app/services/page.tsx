import type { Metadata } from 'next'
import ServicesHero from '@/components/sections/services/ServicesHero'
import ServicesCards from '@/components/sections/services/ServicesCards'
import CtaSection from '@/components/sections/CtaSection'
import JsonLd from '@/components/JsonLd'
import { siteUrl } from '@/lib/siteConfig'

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

import { buildMetadata } from '@/lib/seo/metadata'
import { JsonLdScript, buildBreadcrumbList } from '@/lib/seo/json-ld'

export const metadata: Metadata = buildMetadata({
  title: 'Услуги рекламной компании «2х2» — полиграфия, наружная реклама, фасады',
  description:
    'Полный спектр рекламных услуг в Ханты-Мансийске: печать визиток, листовок, вывески, световые буквы, стелы, оформление фасадов. Онлайн-калькулятор и стартовые цены.',
  path: '/services',
  keywords: [
    'услуги рекламной компании',
    'реклама под ключ ханты-мансийск',
    'полиграфия и наружная реклама',
  ],
})

export default function ServicesPage() {
  return (
    <main>
      <JsonLd data={servicesSchema} />
      <JsonLdScript
        data={buildBreadcrumbList([
          { name: 'Главная', url: '/' },
          { name: 'Услуги', url: '/services' },
        ])}
      />
      <ServicesHero />
      <ServicesCards />
      <CtaSection />
    </main>
  )
}
