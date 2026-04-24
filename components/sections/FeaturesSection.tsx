import { readSectionContent } from '@/lib/cms/section-content'
import FeaturesSectionClient, {
  type FeaturesSectionData,
  type FeatureItem,
} from './FeaturesSectionClient'

const DEFAULT_ITEMS: FeatureItem[] = [
  {
    icon: 'Timer',
    title: 'Расчёт за час',
    description: 'Оставьте заявку — пришлём стоимость и сроки в течение рабочего часа. Без «перезвоним завтра».',
    extra: 'В рабочие часы Пн–Пт 09:00–19:00.',
  },
  {
    icon: 'Factory',
    title: 'Собственное производство',
    description: 'Не перепродаём и не используем субподрядчиков. Производим сами — контролируем качество на каждом этапе.',
    extra: 'Оборудование для печати, резки, сварки и монтажа — в нашем цехе.',
  },
  {
    icon: 'Wrench',
    title: 'Монтаж под ключ',
    description: 'Своя монтажная бригада с допуском к высотным работам. Выезжаем по ХМАО и ЯНАО.',
    extra: 'Промышленный альпинизм, вышки, автовышки — по запросу.',
  },
  {
    icon: 'Ruler',
    title: 'Замер и фотомонтаж бесплатно',
    description: 'При заказе вывески или наружной рекламы — выедем, сделаем замеры и покажем, как будет выглядеть конструкция на фото фасада.',
    extra: 'Видите результат до начала работ.',
  },
  {
    icon: 'Shield',
    title: 'Гарантия на работы',
    description: 'Полиграфия: 100% замена при производственном браке. Наружная реклама: гарантия 12 месяцев на материалы и монтаж.',
    extra: 'LED-подсветка — гарантия 36 месяцев.',
  },
  {
    icon: 'MapPin',
    title: '17 городов ХМАО и ЯНАО',
    description: 'Работаем по всему ХМАО и ЯНАО: Сургут, Нижневартовск, Нефтеюганск, Когалым, Фёдоровский и ещё 11 городов региона.',
    extra: 'Полиграфию отправляем по всей России.',
  },
]

const DEFAULT_DATA: FeaturesSectionData = {
  headline: 'Почему выбирают нас',
  subheadline: 'Шесть причин, по которым нам доверяют сотни компаний в ХМАО и ЯНАО',
  items: DEFAULT_ITEMS,
}

function isFeatureArray(v: unknown): v is FeatureItem[] {
  return (
    Array.isArray(v) &&
    v.every(
      (s) =>
        s &&
        typeof s === 'object' &&
        typeof (s as { title?: unknown }).title === 'string',
    )
  )
}

export default async function FeaturesSection() {
  const cms = await readSectionContent('features')
  const rawItems = cms?.items

  const items: FeatureItem[] = isFeatureArray(rawItems)
    ? rawItems.map((s) => ({
        icon: typeof s.icon === 'string' ? s.icon : '',
        title: typeof s.title === 'string' ? s.title : '',
        description: typeof s.description === 'string' ? s.description : '',
        extra: typeof s.extra === 'string' ? s.extra : '',
      }))
    : DEFAULT_ITEMS

  const data: FeaturesSectionData = {
    headline: typeof cms?.headline === 'string' ? cms.headline : DEFAULT_DATA.headline,
    subheadline: typeof cms?.subheadline === 'string' ? cms.subheadline : DEFAULT_DATA.subheadline,
    items,
  }

  return <FeaturesSectionClient data={data} />
}
