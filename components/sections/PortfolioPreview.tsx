import { readSectionContent } from '@/lib/cms/section-content'
import { listFeaturedPortfolioItems } from '@/lib/data/portfolio'
import PortfolioPreviewClient, {
  type PortfolioSectionData,
  type FeaturedWork,
} from './PortfolioPreviewClient'

const DEFAULT_DATA: PortfolioSectionData = {
  headline: 'Портфолио',
  subheadline:
    'Несколько проектов, реализованных по всему ХМАО и ЯНАО. Полное портфолио — в разделе «Работы».',
  more_button_text: 'Все работы',
  more_button_url: '/portfolio',
}

export default async function PortfolioPreview() {
  const cms = await readSectionContent('portfolio')

  const section: PortfolioSectionData = {
    headline: typeof cms?.headline === 'string' ? cms.headline : DEFAULT_DATA.headline,
    subheadline: typeof cms?.subheadline === 'string' ? cms.subheadline : DEFAULT_DATA.subheadline,
    more_button_text:
      typeof cms?.more_button_text === 'string' && cms.more_button_text.length > 0
        ? cms.more_button_text
        : DEFAULT_DATA.more_button_text,
    more_button_url:
      typeof cms?.more_button_url === 'string' && cms.more_button_url.length > 0
        ? cms.more_button_url
        : DEFAULT_DATA.more_button_url,
  }

  const items = await listFeaturedPortfolioItems()
  const works: FeaturedWork[] = items.slice(0, 3).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    short_description: p.short_description,
    category_label: p.category_label,
    location: p.location,
    cover_url: p.cover_url,
  }))

  return <PortfolioPreviewClient section={section} works={works} />
}
