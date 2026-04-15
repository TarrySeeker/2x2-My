import type { Metadata } from 'next'
import Link from 'next/link'
import { Calculator, ArrowRight } from 'lucide-react'
import ServicesHero from '@/components/sections/services/ServicesHero'
import AnimatedSection from '@/components/ui/AnimatedSection'
import CtaSection from '@/components/sections/CtaSection'
import { buildMetadata } from '@/lib/seo/metadata'
import {
  JsonLdScript,
  buildBreadcrumbList,
  buildFaqPage,
} from '@/lib/seo/json-ld'

export const revalidate = 86400

export const metadata: Metadata = buildMetadata({
  title: 'Калькулятор стоимости рекламы онлайн — «2х2» Ханты-Мансийск',
  description:
    'Онлайн-калькулятор стоимости вывесок, визиток, баннеров и световых букв. Рассчитайте цену за 1 минуту — реальные тарифы «2х2» в Ханты-Мансийске и ХМАО.',
  path: '/calculator',
  keywords: [
    'калькулятор стоимости рекламы',
    'калькулятор вывески онлайн',
    'рассчитать стоимость баннера',
    'рассчитать печать визиток',
    'калькулятор рекламы ханты-мансийск',
    'цена вывески онлайн',
  ],
})

type CalcLink = {
  title: string
  description: string
  href: string
  badge: string
}

const CALC_LINKS: CalcLink[] = [
  {
    title: 'Визитки',
    description: 'Тираж, бумага, ламинация — цена за 1 тираж и за штуку.',
    href: '/catalog/poligrafiya',
    badge: 'от 1,7 ₽/шт.',
  },
  {
    title: 'Листовки и флаеры',
    description: 'Формат А6–А4, плотность бумаги, цветность — мгновенный расчёт.',
    href: '/catalog/poligrafiya',
    badge: 'от 3 ₽/шт.',
  },
  {
    title: 'Баннеры',
    description: 'Ширина × высота в метрах. Материал, люверсы, оформление.',
    href: '/catalog/naruzhnaya-reklama',
    badge: 'от 450 ₽/м²',
  },
  {
    title: 'Световые буквы',
    description: 'Длина периметра, тип подсветки, материал. Сразу вилка цены.',
    href: '/catalog/naruzhnaya-reklama',
    badge: 'от 150 ₽/см',
  },
  {
    title: 'Вывески и лайтбоксы',
    description: 'Размеры, тип конструкции, материалы лицевой части.',
    href: '/catalog/naruzhnaya-reklama',
    badge: 'от 8 500 ₽/м²',
  },
  {
    title: 'Оклейка транспорта',
    description: 'Частичная или полный wrap. Плёнка, площадь, срок.',
    href: '/catalog/oformlenie',
    badge: 'от 15 000 ₽',
  },
]

const FAQ = [
  {
    question: 'Насколько точен калькулятор?',
    answer:
      'Калькулятор даёт стартовую цену по базовым параметрам. Финальная стоимость уточняется менеджером после замеров, фотомонтажа и согласования материалов.',
  },
  {
    question: 'Нужно ли что-то платить за расчёт?',
    answer:
      'Нет. Расчёт стоимости, консультация и фотомонтаж бесплатны. Мы берём оплату только за готовый заказ.',
  },
  {
    question: 'Работает ли калькулятор для сложных проектов?',
    answer:
      'Для крышных вывесок, стел и комплексных фасадных решений нужен индивидуальный расчёт. Оставьте заявку «Заказать расчёт» — ответим в течение часа в рабочее время.',
  },
  {
    question: 'Можно ли получить счёт для юр. лица?',
    answer:
      'Да. Работаем с ООО, ИП и госструктурами по договору. Выставляем счёт, акт, счёт-фактуру и УПД.',
  },
]

export default function CalculatorPage() {
  return (
    <main>
      <JsonLdScript
        data={[
          buildBreadcrumbList([
            { name: 'Главная', url: '/' },
            { name: 'Калькулятор', url: '/calculator' },
          ]),
          buildFaqPage(FAQ),
        ]}
      />

      <ServicesHero
        badge="Онлайн-калькулятор"
        title="Рассчитайте стоимость рекламы за 1 минуту"
        description="Визитки, баннеры, вывески, световые буквы — введите параметры и получите цену сразу. Без регистрации."
      />

      <section className="bg-white py-16">
        <div className="container">
          <AnimatedSection>
            <div className="mx-auto max-w-5xl">
              <div className="mb-12 text-center">
                <h2 className="font-display text-2xl font-bold text-brand-dark md:text-3xl">
                  Какую услугу считаем?
                </h2>
                <p className="mt-3 text-neutral-600">
                  Выберите категорию — калькулятор откроется внутри карточки услуги.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {CALC_LINKS.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 transition hover:-translate-y-1 hover:border-brand-orange/40 hover:shadow-lg"
                  >
                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-orange/10 text-brand-orange">
                          <Calculator className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <span className="text-xs font-semibold text-brand-orange">
                          {item.badge}
                        </span>
                      </div>
                      <h3 className="mb-2 font-display text-lg font-bold text-brand-dark group-hover:text-brand-orange">
                        {item.title}
                      </h3>
                      <p className="text-sm text-neutral-600">{item.description}</p>
                    </div>
                    <div className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-orange">
                      К калькулятору <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="bg-neutral-50 py-16">
        <div className="container">
          <AnimatedSection>
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-8 text-center font-display text-2xl font-bold text-brand-dark md:text-3xl">
                Частые вопросы о калькуляторе
              </h2>
              <div className="space-y-4">
                {FAQ.map((f) => (
                  <details
                    key={f.question}
                    className="group rounded-xl border border-neutral-200 bg-white p-5 open:shadow-md"
                  >
                    <summary className="cursor-pointer list-none font-semibold text-brand-dark marker:hidden">
                      <span className="flex items-center justify-between gap-3">
                        {f.question}
                        <span className="text-brand-orange group-open:rotate-45 transition">
                          +
                        </span>
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-neutral-600">
                      {f.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <CtaSection
        title="Не нашли свою услугу в калькуляторе?"
        subtitle="Закажите индивидуальный расчёт — ответим в течение часа в рабочее время"
      />
    </main>
  )
}
