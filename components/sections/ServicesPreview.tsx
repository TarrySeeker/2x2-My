import { readSectionContent } from '@/lib/cms/section-content'
import ServicesPreviewClient, {
  type ServicesSectionData,
  type ServiceItem,
  type AlsoWeDoItem,
} from './ServicesPreviewClient'

const DEFAULT_ITEMS: ServiceItem[] = [
  {
    icon: 'Newspaper',
    title: 'Офсетная печать',
    description: 'Визитки, листовки, буклеты, каталоги. Офсет дешевле цифры на больших тиражах — экономим ваш бюджет.',
    badge: 'Визитки от 1,7 ₽/шт.',
    image: '/img/pint.png',
    width: '90 см',
    height: '60 см',
    cta_text: 'Заказать',
  },
  {
    icon: 'Signpost',
    title: 'Наружная реклама',
    description: 'Стелы, баннеры, объёмные и световые буквы, входные группы. Собственное производство и монтажная бригада.',
    badge: 'Световые буквы от 150 ₽/см',
    image: '/port/1.png',
    width: '3 м',
    height: '1,5 м',
    cta_text: 'Заказать',
  },
  {
    icon: 'Lightbulb',
    title: 'Световые буквы',
    description: 'Объёмные световые буквы любого формата: открытые, закрытые, контражур. LED-подсветка с гарантией 36 месяцев. Собственное производство.',
    badge: 'От 150 ₽/см периметра',
    image: '/img/facades-maf.png',
    width: '3 м',
    height: '1,2 м',
    cta_text: 'Заказать',
  },
]

const DEFAULT_ALSO: AlsoWeDoItem[] = [
  {
    icon: 'Lightbulb',
    title: 'Архитектурная подсветка и вывески',
    bullets: [
      'Разработка эскизов и согласование с собственником здания',
      'Подбор оборудования, монтаж контурной и архитектурной подсветки',
      'Производство и монтаж вывесок любой сложности',
    ],
  },
  {
    icon: 'Truck',
    title: 'Брендирование транспорта',
    bullets: [
      'Оформление городских автобусов и корпоративного транспорта',
      'Оклейка плёнкой Oracal, Avery — морозостойкой серии для ХМАО',
      'Праздничное и сезонное оформление',
    ],
  },
  {
    icon: 'Compass',
    title: 'Навигация и интерьерное оформление',
    bullets: [
      'Таблички, стенды, системы навигации',
      'Аппликация на стёкла, офисное и интерьерное оформление',
      'Реставрация существующих рекламных конструкций',
    ],
  },
]

const DEFAULT_DATA: ServicesSectionData = {
  headline: 'Наши услуги',
  subheadline: 'Производим сами — не перепродаём',
  items: DEFAULT_ITEMS,
  also_we_do_text: 'Также мы занимаемся',
  also_we_do_subtitle: 'Полный спектр работ под ключ',
  also_we_do_items: DEFAULT_ALSO,
}

function isServiceArray(v: unknown): v is ServiceItem[] {
  return (
    Array.isArray(v) &&
    v.every((s) => s && typeof s === 'object' && typeof (s as { title?: unknown }).title === 'string')
  )
}

function isAlsoArray(v: unknown): v is AlsoWeDoItem[] {
  return (
    Array.isArray(v) &&
    v.every(
      (s) =>
        s &&
        typeof s === 'object' &&
        typeof (s as { title?: unknown }).title === 'string' &&
        Array.isArray((s as { bullets?: unknown }).bullets),
    )
  )
}

export default async function ServicesPreview() {
  const cms = await readSectionContent('services')
  const rawItems = cms?.items
  const rawAlso = cms?.also_we_do_items

  const data: ServicesSectionData = {
    headline: typeof cms?.headline === 'string' ? cms.headline : DEFAULT_DATA.headline,
    subheadline: typeof cms?.subheadline === 'string' ? cms.subheadline : DEFAULT_DATA.subheadline,
    items: isServiceArray(rawItems) ? rawItems : DEFAULT_ITEMS,
    also_we_do_text:
      typeof cms?.also_we_do_text === 'string' && cms.also_we_do_text.length > 0
        ? cms.also_we_do_text
        : DEFAULT_DATA.also_we_do_text,
    also_we_do_subtitle:
      typeof cms?.also_we_do_subtitle === 'string'
        ? cms.also_we_do_subtitle
        : DEFAULT_DATA.also_we_do_subtitle,
    also_we_do_items: isAlsoArray(rawAlso) ? rawAlso : DEFAULT_ALSO,
  }

  return <ServicesPreviewClient data={data} />
}
