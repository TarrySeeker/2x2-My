import type { Metadata } from 'next'
import { sanityFetch } from '@/sanity/client'
import { portfolioQuery } from '@/sanity/queries'
import type { PortfolioItem } from '@/lib/types'
import PortfolioGallery from '@/components/sections/portfolio/PortfolioGallery'
import ServicesHero from '@/components/sections/services/ServicesHero'
import CtaSection from '@/components/sections/CtaSection'
import { featuredPortfolioWorks } from '@/lib/featuredPortfolioWorks'

export const metadata: Metadata = {
  title: 'Портфолио',
  description: 'Работы рекламного агентства 2*2: полиграфия, наружная реклама, оформление фасадов.',
}

export default async function PortfolioPage() {
  let items: PortfolioItem[] = []
  try {
    items = await sanityFetch<PortfolioItem[]>(portfolioQuery)
  } catch {
    // Если Sanity не настроен — показываем пустую галерею
  }

  const description =
    items.length > 0
      ? `${items.length} реализованных проектов`
      : `${featuredPortfolioWorks.length} проектов в галерее — и сотни других реализованных задач`

  return (
    <main>
      <ServicesHero badge="Портфолио" title="Наши работы" description={description} />
      <PortfolioGallery items={items} />
      <CtaSection />
    </main>
  )
}
