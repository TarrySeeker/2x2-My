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

export const metadata: Metadata = {
  title: 'Услуги',
  description: 'Полиграфия, наружная реклама и оформление фасадов от рекламного агентства 2×2.',
}

export default function ServicesPage() {
  return (
    <main>
      <JsonLd data={servicesSchema} />
      <ServicesHero />
      <ServicesCards />
      <CtaSection />
    </main>
  )
}
