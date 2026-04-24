import { readSectionContent } from '@/lib/cms/section-content'
import { listActivePromotions } from '@/lib/data/promotions'
import PromotionsSectionClient, {
  type PromotionsSectionData,
  type PromoView,
} from './PromotionsSectionClient'

const DEFAULT_DATA: PromotionsSectionData = {
  headline: 'Акции и спецпредложения',
  subheadline: 'Воспользуйтесь выгодными условиями прямо сейчас',
  cta_text: 'Получить расчёт',
  cta_url: '/contacts',
}

export default async function PromotionsSection() {
  const cms = await readSectionContent('promotions')

  const section: PromotionsSectionData = {
    headline: typeof cms?.headline === 'string' ? cms.headline : DEFAULT_DATA.headline,
    subheadline: typeof cms?.subheadline === 'string' ? cms.subheadline : DEFAULT_DATA.subheadline,
    cta_text: typeof cms?.cta_text === 'string' ? cms.cta_text : DEFAULT_DATA.cta_text,
    cta_url: typeof cms?.cta_url === 'string' && cms.cta_url ? cms.cta_url : DEFAULT_DATA.cta_url,
  }

  const list = await listActivePromotions()
  const promotions: PromoView[] = list.map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body ?? '',
    link_url: p.link_url,
    link_text: p.link_text,
  }))

  return <PromotionsSectionClient section={section} promotions={promotions} />
}
