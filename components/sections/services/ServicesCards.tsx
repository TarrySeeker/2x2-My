import Image from 'next/image'
import { Newspaper, Signpost, Lightbulb, ArrowRight, type LucideIcon } from 'lucide-react'
import AnimatedSection from '@/components/ui/AnimatedSection'
import Button from '@/components/ui/Button'
import { asset } from '@/lib/asset'

type Service = {
  id: string
  icon: LucideIcon
  title: string
  description: string
  badge: string
  image: string
}

/** Те же услуги, что в блоке «Наши услуги» на главной (ServicesPreview) */
const services: Service[] = [
  {
    id: 'polygraphy',
    icon: Newspaper,
    title: 'Офсетная печать',
    description: 'Визитки, журналы, каталоги, буклеты. Экономим ваш бюджет. Офсет — это дешевле!',
    badge: 'Визитки от 1.7 ₽/шт.',
    image: '/img/pint.png',
  },
  {
    id: 'outdoor',
    icon: Signpost,
    title: 'Наружная реклама',
    description: 'Стелы, фасады, фигуры и многое другое. Реализуем любые, даже самые невероятные идеи!',
    badge: 'Световые буквы от 150 р./см.',
    image: '/port/1.png',
  },
  {
    id: 'svetovye-bukvy',
    icon: Lightbulb,
    title: 'Световые буквы',
    description: 'Объёмные световые буквы: открытые, закрытые, контражур. LED-подсветка с гарантией 36 месяцев.',
    badge: 'От 150 ₽/см периметра',
    image: '/img/facades-maf.png',
  },
]

export default function ServicesCards() {
  return (
    <section className="section-padding bg-white">
      <div className="container">
        {services.map((service, i) => {
          const Icon = service.icon
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
                  <h2 className="mb-3 text-xl font-black text-brand-dark sm:mb-4 sm:text-2xl md:mb-4 md:text-3xl">
                    {service.title}
                  </h2>
                  <p className="mb-5 text-base leading-relaxed text-gray-500 sm:mb-6 md:text-lg">
                    {service.description}
                  </p>
                  <div className="mb-8">
                    <span className="inline-flex items-center gap-2 rounded-full bg-brand-orange/10 px-4 py-2 text-sm font-semibold text-brand-orange shadow-[0_0_12px_rgba(255,107,0,0.3)]">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-brand-orange" />
                      {service.badge}
                    </span>
                  </div>
                  <Button href="/contacts">
                    Заказать <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className={isEven ? 'lg:order-2' : 'lg:order-1'}>
                  <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl shadow-xl">
                    <Image
                      src={asset(service.image)}
                      alt={service.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>
                </div>
              </div>
              {i < services.length - 1 && <hr className="mt-20 border-gray-100" />}
            </AnimatedSection>
          )
        })}
      </div>
    </section>
  )
}
