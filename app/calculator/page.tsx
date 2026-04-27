import Link from 'next/link'
import { Calculator, ArrowRight } from 'lucide-react'
import ServicesHero from '@/components/sections/services/ServicesHero'
import AnimatedSection from '@/components/ui/AnimatedSection'
import CtaSection from '@/components/sections/CtaSection'
import { makeGenerateMetadata } from '@/lib/seo/metadata-cms'
import { readPageSectionContent } from '@/lib/cms/page-section-content'
import {
  JsonLdScript,
  buildBreadcrumbList,
  buildFaqPage,
} from '@/lib/seo/json-ld'

// Был revalidate = 86400, но ISR всё равно пытается prerender на build —
// с placeholder-DATABASE_URL это вызывает 10s × 4 запроса зависания.
// Переводим в dynamic; per-request кеш data-layer (60s) даёт похожий
// эффект скорости без проблем сборки. См. комментарий в app/page.tsx.
export const dynamic = 'force-dynamic'

export const generateMetadata = makeGenerateMetadata({
  path: '/calculator',
  fallback: {
    title: 'Калькулятор стоимости рекламы онлайн — «2х2» Ханты-Мансийск',
    description:
      'Онлайн-калькулятор стоимости вывесок, визиток, баннеров и световых букв. Рассчитайте цену за 1 минуту — реальные тарифы «2х2» в Ханты-Мансийске и ХМАО.',
    keywords: [
      'калькулятор стоимости рекламы',
      'калькулятор вывески онлайн',
      'рассчитать стоимость баннера',
      'рассчитать печать визиток',
      'калькулятор рекламы ханты-мансийск',
      'цена вывески онлайн',
    ],
  },
})

type CalcLink = {
  title: string
  description: string
  href: string
  badge: string
}

const CALC_LINKS_FALLBACK: CalcLink[] = [
  {
    title: 'Визитки',
    description: 'Тираж, бумага, ламинация — цена за 1 тираж и за штуку.',
    href: '/services',
    badge: 'от 1,7 ₽/шт.',
  },
  {
    title: 'Листовки и флаеры',
    description: 'Формат А6–А4, плотность бумаги, цветность — мгновенный расчёт.',
    href: '/services',
    badge: 'от 3 ₽/шт.',
  },
  {
    title: 'Баннеры',
    description: 'Ширина × высота в метрах. Материал, люверсы, оформление.',
    href: '/services',
    badge: 'от 450 ₽/м²',
  },
  {
    title: 'Световые буквы',
    description: 'Длина периметра, тип подсветки, материал. Сразу вилка цены.',
    href: '/services',
    badge: 'от 150 ₽/см',
  },
  {
    title: 'Вывески и лайтбоксы',
    description: 'Размеры, тип конструкции, материалы лицевой части.',
    href: '/services',
    badge: 'от 8 500 ₽/м²',
  },
  {
    title: 'Оклейка транспорта',
    description: 'Частичная или полный wrap. Плёнка, площадь, срок.',
    href: '/services',
    badge: 'от 15 000 ₽',
  },
]

const FAQ_FALLBACK = [
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

export default async function CalculatorPage() {
  const [heroCms, categoriesCms, faqCms, ctaCms] = await Promise.all([
    readPageSectionContent('/calculator', 'hero', 'hero'),
    readPageSectionContent('/calculator', 'categories', 'cards_grid'),
    readPageSectionContent('/calculator', 'faq', 'faq'),
    readPageSectionContent('/calculator', 'cta', 'cta'),
  ])

  // Categories: используем CMS, если есть, иначе fallback
  const calcLinks: CalcLink[] =
    categoriesCms?.content.items && categoriesCms.content.items.length > 0
      ? categoriesCms.content.items.map((i) => ({
          title: i.title,
          description: i.description ?? '',
          href: i.href,
          badge: i.badge ?? '',
        }))
      : CALC_LINKS_FALLBACK

  const categoriesHeadline =
    categoriesCms?.content.headline || 'Какую услугу считаем?'
  const categoriesSubheadline =
    categoriesCms?.content.subheadline ||
    'Выберите категорию — калькулятор откроется внутри карточки услуги.'

  // FAQ: CMS приоритет
  const faqItems =
    faqCms?.content.items && faqCms.content.items.length > 0
      ? faqCms.content.items.map((i) => ({ question: i.question, answer: i.answer }))
      : FAQ_FALLBACK
  const faqHeadline = faqCms?.content.headline || 'Частые вопросы о калькуляторе'

  return (
    <main>
      <JsonLdScript
        data={[
          buildBreadcrumbList([
            { name: 'Главная', url: '/' },
            { name: 'Калькулятор', url: '/calculator' },
          ]),
          buildFaqPage(faqItems),
        ]}
      />

      <ServicesHero
        badge={heroCms?.content.badge || 'Онлайн-калькулятор'}
        title={heroCms?.content.title || 'Рассчитайте стоимость рекламы за 1 минуту'}
        description={
          heroCms?.content.description ||
          'Визитки, баннеры, вывески, световые буквы — введите параметры и получите цену сразу. Без регистрации.'
        }
      />

      <section className="bg-white py-16">
        <div className="container">
          <AnimatedSection>
            <div className="mx-auto max-w-5xl">
              <div className="mb-12 text-center">
                <h2 className="font-display text-2xl font-bold text-brand-dark md:text-3xl">
                  {categoriesHeadline}
                </h2>
                <p className="mt-3 text-neutral-600">{categoriesSubheadline}</p>
              </div>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {calcLinks.map((item) => (
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
                      {categoriesCms?.content.cta_text_on_card || 'К калькулятору'}{' '}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
                {faqHeadline}
              </h2>
              <div className="space-y-4">
                {faqItems.map((f) => (
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
        title={ctaCms?.content.headline || 'Не нашли свою услугу в калькуляторе?'}
        subtitle={
          ctaCms?.content.subheadline ||
          'Закажите индивидуальный расчёт — ответим в течение часа в рабочее время'
        }
      />
    </main>
  )
}
