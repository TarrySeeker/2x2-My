import Image from 'next/image'
import { Newspaper, Signpost, Lightbulb } from 'lucide-react'
import AnimatedSection from '@/components/ui/AnimatedSection'
import { asset } from '@/lib/asset'
import { listEnabledServices } from '@/lib/data/services'
import { resolveIcon } from '@/lib/cms/icon-map'
import {
  SERVICE_CATEGORIES,
  getServiceCategoryLabel,
} from '@/lib/services/categories'
import ServicesCardCTA from './ServicesCardCTA'

type ServiceCard = {
  id: string
  iconName: string | null
  title: string
  description: string
  badge: string
  image: string
  href: string | null
  /** Машинный slug категории (`polygraphy` / `outdoor` / …) или null. */
  category: string | null
}

/**
 * Fallback — те же 3 карточки, что были до миграции на БД (`servicesTeasers`).
 * Используются, если `services` table пуста (на старте проекта или при
 * недоступной БД во время build/SSR).
 */
const FALLBACK_CARDS: ServiceCard[] = [
  {
    id: 'polygraphy',
    iconName: 'Newspaper',
    title: 'Офсетная печать',
    description: 'Визитки, журналы, каталоги, буклеты. Экономим ваш бюджет. Офсет — это дешевле!',
    badge: 'Визитки от 1.7 ₽/шт.',
    image: '/img/pint.png',
    href: '/contacts',
    category: 'polygraphy',
  },
  {
    id: 'outdoor',
    iconName: 'Signpost',
    title: 'Наружная реклама',
    description: 'Стелы, фасады, фигуры и многое другое. Реализуем любые, даже самые невероятные идеи!',
    badge: 'Световые буквы от 150 р./см.',
    image: '/port/1.webp',
    href: '/contacts',
    category: 'outdoor',
  },
  {
    id: 'svetovye-bukvy',
    iconName: 'Lightbulb',
    title: 'Световые буквы',
    description: 'Объёмные световые буквы: открытые, закрытые, контражур. LED-подсветка с гарантией 36 месяцев.',
    badge: 'От 150 ₽/см периметра',
    image: '/img/facades-maf.png',
    href: '/contacts',
    category: 'outdoor',
  },
]

const FALLBACK_ICONS: Record<string, typeof Newspaper> = {
  Newspaper,
  Signpost,
  Lightbulb,
}

function lucideKebabToPascal(name: string | null | undefined): string | null {
  if (!name) return null
  return name
    .split('-')
    .map((p) => (p ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join('')
}

/**
 * Порядок групп = порядок в SERVICE_CATEGORIES + «Прочее» (категории не
 * из списка) в самом конце. Так заголовки идут предсказуемо («Полиграфия»
 * раньше «Наружной рекламы»), даже если в админке услуги стоят в другом
 * `display_order`.
 */
function groupByCategory(cards: ServiceCard[]): {
  key: string
  label: string
  items: ServiceCard[]
}[] {
  const buckets = new Map<string, ServiceCard[]>()
  for (const card of cards) {
    const key = card.category ?? '__other__'
    const list = buckets.get(key) ?? []
    list.push(card)
    buckets.set(key, list)
  }

  const order: { key: string; label: string }[] = SERVICE_CATEGORIES.map((c) => ({
    key: c.value,
    label: c.label,
  }))

  // Категории не из SERVICE_CATEGORIES (например, legacy-значение или
  // админ-ручная строка) и null-категория — все идут в «Прочее».
  const knownKeys = new Set(order.map((o) => o.key))
  const unknownKeys: string[] = []
  for (const key of buckets.keys()) {
    if (!knownKeys.has(key) && key !== '__other__') unknownKeys.push(key)
  }

  const result: { key: string; label: string; items: ServiceCard[] }[] = []
  for (const o of order) {
    const items = buckets.get(o.key)
    if (items && items.length > 0) result.push({ key: o.key, label: o.label, items })
  }
  // unknown → «Прочее» (объединяем с __other__).
  const otherItems: ServiceCard[] = []
  for (const k of unknownKeys) otherItems.push(...(buckets.get(k) ?? []))
  otherItems.push(...(buckets.get('__other__') ?? []))
  if (otherItems.length > 0) {
    result.push({ key: '__other__', label: 'Прочее', items: otherItems })
  }
  return result
}

export default async function ServicesCards() {
  const dbServices = await listEnabledServices()

  // Если есть карточки в БД — рендерим все enabled услуги (а не первые 3,
  // как в ServicesPreview на главной — здесь полная страница каталога).
  const cards: ServiceCard[] =
    dbServices.length > 0
      ? dbServices.map((s) => ({
          id: s.slug,
          iconName: lucideKebabToPascal(s.icon),
          title: s.title,
          description:
            s.short_description ??
            s.long_description ??
            'Подробности — у наших менеджеров.',
          badge: s.price_label ?? (s.price_from ? `от ${s.price_from} ₽` : 'По запросу'),
          image: s.cover_image ?? '/img/pint.png',
          href: s.href ?? '/contacts',
          category: s.category ?? null,
        }))
      : FALLBACK_CARDS

  const groups = groupByCategory(cards)
  // Если все услуги в одной категории (или не задана у всех) — заголовок
  // группы — лишний шум. Скрываем.
  const hideGroupHeaders = groups.length <= 1

  // Глобальный счётчик карточек: важен для AnimatedSection-direction
  // (alternating left/right) и для priority-image (первые 2 — eager).
  let cardIndex = 0
  const totalCards = cards.length

  return (
    <section className="section-padding bg-white">
      <div className="container">
        {groups.map((group, groupIdx) => (
          <div
            key={group.key}
            id={group.key === '__other__' ? 'other' : group.key}
            className={groupIdx > 0 ? 'mt-16' : undefined}
          >
            {!hideGroupHeaders && (
              <div className="mb-10 md:mb-12">
                {/* aria-hidden: та же надпись есть в h2 ниже — скринридер не должен
                    читать категорию дважды («Полиграфия Полиграфия»). */}
                <span
                  aria-hidden="true"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-orange/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-orange"
                >
                  {getServiceCategoryLabel(
                    group.key === '__other__' ? null : group.key,
                    group.label,
                  )}
                </span>
                <h2 className="mt-3 text-2xl font-black text-brand-dark md:text-3xl">
                  {group.label}
                </h2>
              </div>
            )}

            {group.items.map((service) => {
              const i = cardIndex++
              const Icon =
                (service.iconName && resolveIcon(service.iconName)) ||
                (service.iconName && FALLBACK_ICONS[service.iconName]) ||
                Newspaper
              const isEven = i % 2 === 0
              return (
                <AnimatedSection key={service.id} className="mb-20 last:mb-0">
                  <div
                    id={service.id}
                    className={`grid grid-cols-1 items-center gap-12 lg:grid-cols-2 ${!isEven ? 'direction-rtl' : ''}`}
                  >
                    <div className={isEven ? 'lg:order-1' : 'lg:order-2'}>
                      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 shadow-[0_8px_24px_-8px_rgba(255,102,0,0.25)] ring-1 ring-orange-200/60">
                        <Icon className="h-8 w-8 text-brand-orange" strokeWidth={1.5} />
                      </div>
                      <h3 className="mb-3 text-xl font-black text-brand-dark sm:mb-4 sm:text-2xl md:mb-4 md:text-3xl">
                        {service.title}
                      </h3>
                      <p className="mb-5 text-base leading-relaxed text-gray-500 sm:mb-6 md:text-lg">
                        {service.description}
                      </p>
                      <div className="mb-8">
                        <span className="inline-flex items-center gap-2 rounded-full bg-brand-orange/10 px-4 py-2 text-sm font-semibold text-brand-orange shadow-[0_0_12px_rgba(255,107,0,0.3)]">
                          <span className="h-2 w-2 animate-pulse rounded-full bg-brand-orange" />
                          {service.badge}
                        </span>
                      </div>
                      {/* Open QuoteModal через client-component — единое
                          поведение с главной (ServicesPreviewClient). */}
                      <ServicesCardCTA
                        serviceTitle={service.title}
                        serviceSlug={service.id}
                      />
                    </div>
                    <div className={isEven ? 'lg:order-2' : 'lg:order-1'}>
                      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl shadow-xl">
                        <Image
                          src={asset(service.image)}
                          alt={service.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          priority={i < 2}
                        />
                      </div>
                    </div>
                  </div>
                  {i < totalCards - 1 && <hr className="mt-20 border-gray-100" />}
                </AnimatedSection>
              )
            })}
          </div>
        ))}
      </div>
    </section>
  )
}
