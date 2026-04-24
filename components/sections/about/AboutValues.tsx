import { readPageSectionContent } from '@/lib/cms/page-section-content'
import AboutValuesClient, {
  type AboutValuesData,
  type AboutValuesItem,
} from './AboutValuesClient'

const DEFAULT_ITEMS: AboutValuesItem[] = [
  {
    icon: 'Star',
    title: 'Качество',
    description: 'Не идём на компромисс с качеством материалов и исполнения.',
  },
  {
    icon: 'Clock',
    title: 'Сроки',
    description: 'Всегда укладываемся в дедлайн, даже при срочных заказах.',
  },
  {
    icon: 'Heart',
    title: 'Отношение',
    description: 'К каждому клиенту — индивидуальный подход.',
  },
  {
    icon: 'Users',
    title: 'Команда',
    description: 'Опытные специалисты на каждом этапе: дизайн, производство, монтаж.',
  },
]

// Fallback headline содержит акцент-gradient; заголовок из CMS — обычный текст.
// Поэтому для дефолта передаём простой текст (gradient отрисуется только в fallback-режиме)
const DEFAULT_DATA: AboutValuesData = {
  headline: 'Наши ценности',
  subheadline: 'То, что отличает нас от других агентств',
  items: DEFAULT_ITEMS,
}

/**
 * Server-component для /about/values. CMS приоритет; fallback — константы.
 */
export default async function AboutValues() {
  const cms = await readPageSectionContent('/about', 'values', 'values')
  const items =
    cms?.content.items && cms.content.items.length > 0
      ? cms.content.items.map((i) => ({
          icon: i.icon || '',
          title: i.title,
          description: i.description || '',
        }))
      : DEFAULT_ITEMS
  const data: AboutValuesData = {
    headline: cms?.content.headline || DEFAULT_DATA.headline,
    subheadline: cms?.content.subheadline || DEFAULT_DATA.subheadline,
    items,
  }
  return <AboutValuesClient data={data} />
}
